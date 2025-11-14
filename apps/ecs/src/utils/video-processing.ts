import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import ffmpeg from 'fluent-ffmpeg';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import type { formatType } from './types.js';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand
} from "@aws-sdk/client-transcribe";

// ✅ Define ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const videoFormat: formatType[] = [
  { name: "360P", scale: "w=640:h=360", resolution: "640x360" },
  { name: "480P", scale: "w=842:h=480", resolution: "842x480" },
  { name: "720P", scale: "w=1280:h=720", resolution: "1280x720" },
  { name: "1080P", scale: "w=1920:h=1080", resolution: "1920x1080" },
];

let allLinks: { [key: string]: string } = {};

function calculateBandWidth(resolution: string): number {
  switch (resolution) {
    case "640x360": return 800 * 360;
    case "842x480": return 800 * 480;
    case "1280x720": return 800 * 720;
    case "1920x1080": return 800 * 1080;
    default: return 0;
  }
}

const s3Client = new S3Client({
  region: process.env.MY_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

const transcribeClient = new TranscribeClient({
  region: process.env.MY_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});


async function runParllelTasks(folderPath: string, videoPath: string) {
  console.log("Starting parallel video conversion tasks...");

  if (!fs.existsSync(folderPath)) {
    console.error("Folder path does not exist:", folderPath);
    process.exit(1);
  }

  const tasks = videoFormat.map(format => {
    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, 'video-worker.js'), {
        workerData: { format, folderPath, videoPath }
      });

      worker.on('message', (message) => {
        if (message.status === 'success') {
          resolve();
        } else {
          reject(new Error(message.error));
        }
      });

      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  });

  try {
    await Promise.all(tasks);
    console.log("All video conversion tasks completed.");
  } catch (error) {
    console.error("Error in video conversion tasks:", error);
    process.exit(1);
  }
}

function generatePlaylistFile(folderPath: string) {
  const playlistPath = path.join(folderPath, "playlist.m3u8");

  try {
    let playlistContent = "#EXTM3U\n#EXT-X-VERSION:3\n";
    videoFormat.forEach((format) => {
      const bandwidth = calculateBandWidth(format.resolution);
      playlistContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${format.resolution},SUBTITLES="subs"\n`;
      playlistContent += `${format.name}/index.m3u8\n\n`;
    });

    fs.writeFileSync(playlistPath, playlistContent);
    console.log("Playlist file generated successfully!");
  } catch (error) {
    console.log("Error generating playlist file");
    console.error(error);
  }
}

async function downloadFromS3(bucketName: string, objectKey: string, filePath: string) {
  try {
    const { Body } = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    }));
    const writeStream = fs.createWriteStream(filePath);
    (Body as NodeJS.ReadableStream)?.pipe(writeStream);

    return new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => {
        console.log(`Downloaded ${objectKey} from S3 to ${filePath}`);
        resolve();
      });

      writeStream.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading ${objectKey} from S3 bucket ${bucketName} :`, error);
  }
}

async function uploadFile(filePath: string, bucketName: string, videoName: string, prefix: string = "") {
  try {
    const fileStream = fs.createReadStream(filePath);
    const fileName = path.basename(filePath);
    let key = `videos/${videoName}/`;
    key += prefix ? `${prefix}${fileName}` : fileName;

    console.log(`Uploading ${fileName} with key ${key}`);
    const data = await s3Client.send(
      new PutObjectCommand({ Bucket: bucketName, Key: key, Body: fileStream })
    );

    if (fileName.includes('index.m3u8') || fileName.includes('playlist.m3u8')) {
      const objectUrl = `https://${process.env.CDN_DISTRIBUTION_DOMAIN}/${key}`;
      if (fileName.includes('playlist.m3u8')) {
        allLinks['auto'] = objectUrl;
      } else {
        if (key.includes('360P')) allLinks['360P'] = objectUrl;
        else if (key.includes('480P')) allLinks['480P'] = objectUrl;
        else if (key.includes('720P')) allLinks['720P'] = objectUrl;
        else if (key.includes('1080P')) allLinks['1080P'] = objectUrl;
      }
      console.log(`Uploaded playlist/index: ${objectUrl}`);
    }
    return data;
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}

async function deleteObjectFromTempBucket(key: string) {
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.TEMP_S3_BUCKET_NAME!,
      Key: key,
    }));
    console.log(`Deleted ${key} from temp bucket`);
  } catch (error) {
    console.error(`Error deleting ${key} from temp bucket:`, error);
  }
}

async function uploadFolderToS3(folderPath: string, bucketName: string, videoName: string, prefix: string = "") {
  try {
    const files = fs.readdirSync(folderPath);
    const uploadPromises = [];

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        const subPrefix = prefix ? `${prefix}${file}/` : `${file}/`;
        uploadPromises.push(uploadFolderToS3(filePath, bucketName, videoName, subPrefix));
      } else {
        uploadPromises.push(uploadFile(filePath, bucketName, videoName, prefix));
      }
    }

    await Promise.all(uploadPromises);
    return allLinks;
  } catch (error) {
    console.error(`Error uploading folder ${folderPath} to S3:`, error);
  }
}

async function generateSubtitles(key: string, bucketName: string) {
  const videoName = key.split("/").pop()!.split(".")[0]!;
  const mediaUri = `https://${bucketName}.s3.${process.env.MY_AWS_REGION}.amazonaws.com/${key}`;
  const outputBucket = process.env.FINAL_S3_BUCKET_NAME;
  const cloudFrontDomain = process.env.CDN_DISTRIBUTION_DOMAIN;
  const jobName = `video-${videoName}-subtitles`;
  const destKey = `videos/${videoName}/subtitles.vtt`;

  try {
    await s3Client.send(new HeadObjectCommand({
        Bucket: outputBucket!,
        Key: destKey,
    }))
    console.log("Subtitles already exist, skipping generation.");
    allLinks['subtitles'] = `https://${cloudFrontDomain}/${destKey}`;
    return allLinks['subtitles'];
  } catch (err: any) {
    if (err.name !== "NotFound" && err.$metadata?.httpStatusCode !== 404) {
      console.error("Error checking subtitles:", err);
      throw err;
    }
    console.log("No existing subtitles found, generating new ones...");
  }


  await transcribeClient.send(
    new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: "en-US",
      Media: { MediaFileUri: mediaUri },
      OutputBucketName: outputBucket,
      Subtitles: { Formats: ["vtt"], OutputStartIndex: 1 },
    })
  );

  console.log("Started transcription job:", jobName);

  let jobStatus = "IN_PROGRESS";
  while (jobStatus === "IN_PROGRESS") {
    await new Promise(r => setTimeout(r, 10000));
    const result = await transcribeClient.send(
      new GetTranscriptionJobCommand({ TranscriptionJobName: jobName })
    );
    jobStatus = result.TranscriptionJob?.TranscriptionJobStatus || "FAILED";
  }

  if (jobStatus !== "COMPLETED") throw new Error("Transcription failed");

  const sourceKey = `${jobName}.vtt`;

  await s3Client.send(
    new CopyObjectCommand({
      Bucket: outputBucket,
      CopySource: `${outputBucket}/${sourceKey}`,
      Key: destKey,
      ContentType: "text/vtt",
    })
  );

  for (const key of [sourceKey, `${jobName}.json`, ".write_access_check_file.temp"]) {
    try {
      await deleteObjectFromTempBucket(key);
    } catch {}
  }

  const subtitleUrl = `https://${cloudFrontDomain}/${destKey}`;
  console.log("✅ Subtitle saved to:", subtitleUrl);
  allLinks['subtitles'] = subtitleUrl;

  return subtitleUrl;
}

export {
  // convertVideo,
  runParllelTasks,
  generatePlaylistFile,
  downloadFromS3,
  uploadFile,
  deleteObjectFromTempBucket,
  uploadFolderToS3,
  generateSubtitles,
};