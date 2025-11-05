const { S3Client, CopyObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const axios = require("axios");

const s3 = new S3Client({ 
  region: process.env.MY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY
  }
});

const ddb = new DynamoDBClient({
  region: process.env.MY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET = process.env.TEMP_S3_BUCKET_NAME;

function decodeKey(rawKey) {
  return decodeURIComponent(rawKey.replace(/\+/g, " "));
}

function cleanKey(decoded) {
  return decoded.replace(/\\+$/g, "");
}

exports.handler = async (event) => {
  console.log("S3 event:", JSON.stringify(event, null, 2));

  const record = event.Records?.[0];
  if (!record) {
    console.error("No Records found in event");
    return;
  }

  let rawKey = record.s3.object.key;
  let decoded = decodeKey(rawKey);
  let cleaned = cleanKey(decoded);

  console.log("Original key:", rawKey);
  console.log("Decoded key:", decoded);
  console.log("Cleaned key:", cleaned);


    if (decoded === cleaned) {
      decoded = rawKey;
    }
    // Fetch metadata from DynamoDB
    let metadata = null;
    try {
      const getCmd = new GetItemCommand({
        TableName: process.env.DDB_TABLE_NAME,
        Key: { pk: { S: cleaned } },
      });
      const res = await ddb.send(getCmd);
      
      if (res.Item) {
        metadata = {
          userId: res.Item.userId.S,
          title: res.Item.title.S,
          description: res.Item.description.S,
        };
        console.log("Fetched metadata from DynamoDB:", metadata);
      } else {
        console.warn("No metadata found in DynamoDB for key:", cleaned);
      }
    } catch (e) {
      console.warn("DynamoDB lookup failed:", e.message);
    }
    
    if (!metadata) {
      metadata = {
        userId: "unknown",
      title: "Unknown",
      description: "Uploaded file",
    };
  }

  // Copy the object to a clean key with metadata
  try {
    if (decoded !== cleaned) {

      const copySource = encodeURIComponent(`${BUCKET}/${decoded}`);
      await s3.send(
        new CopyObjectCommand({
          Bucket: BUCKET,
          CopySource: copySource,
          Key: cleaned,
          Metadata: metadata,
          MetadataDirective: "REPLACE",
          ContentType: "video/mp4",
        })
      );
      
      console.log(`Copied object to cleaned key: ${cleaned}`);
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: decoded }));
      console.log(`Deleted original object: ${decoded}`);
    }
      const payload = {
        s3EventData: {
          key: cleaned,
          metadata: metadata,
        }
      }
      if (process.env.API_ENDPOINT) {
      try {
        const response = await axios.post(process.env.API_ENDPOINT, payload);
        console.log("API Response:", response.data);
      } catch (e) {
        console.warn("API post failed:", e.message);
      }
    }
    console.log("Successfully fixed key from", decoded, "to", cleaned);
    console.log("Raw key was:", rawKey);
  } catch (err) {
    console.error("Error fixing key:", decoded, err);
  }
};
