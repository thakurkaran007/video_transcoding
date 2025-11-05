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

    const key = process.env.OBJECT_KEY!;
    const bucketName = process.env.TEMP_S3_BUCKET_NAME!;
    const finalBucketName = process.env.FINAL_S3_BUCKET_NAME!;

    if (!key) {
      console.error("No video to process");
      process.exit(1);
    }

    const videoName = key.split("/").pop()!;
    const videoNameWithoutExtension = videoName.split(".")[0]!;
    const folderPath = path.join(
      __dirname,
      "downloads",
      videoNameWithoutExtension
    );

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    console.log("Downloading video from S3 bucket...");
    await downloadFromS3(key, bucketName, path.join(folderPath, videoName));

    const [thumbnailUrl] = await Promise.all([
      generateSubtitles(key, bucketName),
      downloadFromS3(key, bucketName, path.join(folderPath, videoName)),
    ]);

    console.log("Thumbnail URL => ", thumbnailUrl);
    console.log("Video downloaded successfully!");

    const downloadedVideoPath = path.join(folderPath, videoName);
    await runParllelTasks(folderPath, downloadedVideoPath);

    generatePlaylistFile(folderPath);

    fs.unlinkSync(downloadedVideoPath);

    const allLinks = await uploadFolderToS3(
      folderPath,
      finalBucketName,
      videoNameWithoutExtension
    );

    await Promise.all([
      markTaskAsCompleted(key, allLinks!, thumbnailUrl),
      deleteObjectFromTempBucket(key),
    ]);

    console.log("Video processing completed successfully!");
    process.exit(0);

  } catch (error) {
    console.log("Error:", error);
    process.exit(1);
  }
})();