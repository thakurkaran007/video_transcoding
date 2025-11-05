import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deleteObjectFromTempBucket, downloadFromS3, generatePlaylistFile, generateSubtitles, runParllelTasks, uploadFolderToS3 } from './utils/video-processing.js';

// Load environment variables
dotenv.config();

// ESM-safe version of __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function markTaskAsCompleted(
  key: string,
  allFilesObjects: { [key: string]: string },
  thumbnailUrl: string = ""
) {
  try {
    const webhookUrl = process.env.WEBHOOK_URL;
    console.log("Webhook URL =>", webhookUrl);

    const response = await axios.post(webhookUrl!, {
      objectKey: key,
      progress: "COMPLETED",
      videoResolutions: allFilesObjects,
      thumbnailUrl,
      subtitleUrl: allFilesObjects.subtitles,
    });

    if (response.status === 200) {
      console.log("Webhook called successfully (completed)!");
    }
  } catch (error) {
    console.log("Error while calling webhook:", error);
    process.exit(1);
  }
}

(async function () {
  try {
    console.log("Starting video processing...");

    const key = "uploads/videos/Serenity.mp4";
    // const bucketName = process.env.TEMP_S3_BUCKET_NAME!;
    const bucketName = "my-name-is-karan-thakur";
    const finalBucketName = process.env.FINAL_S3_BUCKET_NAME!;

    await generateSubtitles(key, bucketName)
  } catch (error) {
    console.log("Error:", error);
    process.exit(1);
  }
})();