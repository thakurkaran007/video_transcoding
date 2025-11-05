import { S3Client, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import type { putConfigSchema } from '../types/index.js';


const s3Client = new S3Client({
    region: process.env.MY_AWS_REGION,
    credentials: {
        accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!
    }
})

const ddb = new DynamoDBClient({
    region: process.env.MY_AWS_REGION,
    credentials: {
        accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!
    }
});

async function getObjectMetadata(key: string) {
    try {
        const command = new HeadObjectCommand({
            Bucket: process.env.TEMP_BUCKET_NAME,
            Key: key
        });
        const response = await s3Client.send(command);
        return response;
    } catch (error) {
        console.error('Error fetching object metadata:', error);
    }
}

async function generateUrlToPutObject(config: z.infer<typeof putConfigSchema>) {
    console.log("Generating signed URL for PUT with config:", config);
    if (!config.userId) {
        throw new Error("User ID is required to generate signed URL.");
    }
    
    const key = `uploads/videos/${config.filename.replace(/\\/g, '')}`
    try {
        const command = new PutObjectCommand({
            Bucket: process.env.TEMP_S3_BUCKET_NAME!,
            Key: key,
            ContentType: config.contentType
        })

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        await ddb.send(new PutItemCommand({
            TableName: process.env.DDB_TABLE_NAME!,
            Item: {
                pk: { S: key},
                userId: { S: config.userId },
                title: { S: config.title },
                description: { S: config.description },
            }
        })) 
        console.log("Generated signed URL for PUT:", signedUrl);
        return signedUrl;
    } catch (error) {
        console.error('Error generating signed URL for PUT:', error);   
    }
}

async function deleteObjectFile(key: string) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: process.env.TEMP_BUCKET_NAME,
            Key: key
        });
        await s3Client.send(command);
    } catch (error) {
        console.error('Error deleting object file:', error);
    }
}

export { getObjectMetadata, generateUrlToPutObject, deleteObjectFile };