import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { Worker } from 'worker_threads';
import ffmpeg from 'fluent-ffmpeg';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { format } from './types';

const videoFormat: format[] = [
  { name: "360P", scale: "w=640:h=360", resolution: "640x360" },
  { name: "480P", scale: "w=842:h=480", resolution: "842x480" },
  { name: "720P", scale: "w=1280:h=720", resolution: "1280x720" },
  { name: "1080P", scale: "w=1920:h=1080", resolution: "1920x1080" },
];

let allLinks: { [key: string]: string } = {};

function calculateBandWidth(resolution:string):number {
    switch (resolution) {
        case "640x360":
            return 800 * 360;
        case "842x480":
            return 800 * 480;
        case "1280x720":
            return 800 * 720;
        case "1920x1080":
            return 800 * 1080;
        default:
            return 0;
    }
}

const s3Client = new S3Client({
    region: process.env.AWS_REGION || '',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});


function convertVideo(format:format, folderPath:string, videoPath:string) {
    return new Promise<void>((resolve, reject) => {
        const outputPath = path.join(folderPath, format.name);

        // Check if output directory exists, if not create it
        if (!fs.existsSync(outputPath))  {
            fs.mkdirSync(outputPath, { recursive: true }); // recursive to create nested directories if needed
        }

        ffmpeg(videoPath)
            .outputOptions([
                "-profile:v baseline",
                "-level 3.0",
                `-vf scale=${format.scale}`,
                "-start_number 0",
                "-hls_time 10",
                "-hls_list_size 0",
                `-hls_segment_filename ${path.join(outputPath, "segment_%03d.ts")}`,
                "-f hls"
            ])
            .output(path.join(outputPath, "index.m3u8"))
            .on('end', () => {
                console.log(`Finished processing ${format.name}`);
                resolve();
            })
            .on('error', (err) => {
                console.error(`Error processing ${format.name}:`, err);
                reject(err);
            })
            .run();
    })
} 

async function runParllelTasks(folderPath:string, videoPath:string) {
    console.log("Starting parallel video conversion tasks...");

    if (!fs.existsSync(folderPath)) { // Check if folder path exists
        console.error("Folder path does not exist:", folderPath);
        process.exit(1);
    }

    const tasks = videoFormat.map(format => {
        return new Promise<void>((resolve, reject) => {
            const worker = new Worker(path.join(__dirname, 'video-worker.js'), {
                workerData: { format, folderPath, videoPath }
            })

            worker.on('message', (message) => {
                if (message.status === 'success') {
                    resolve();
                } else {
                    reject(new Error(message.error));
                }
            })

            worker.on('error', (error) => {
                reject(error);
            })

            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            })
        })
    });
    try {
        await Promise.all(tasks);
        console.log("All video conversion tasks completed.");
    } catch (error) {
        console.error("Error in video conversion tasks:", error);
        console.error(error);
        process.exit(1);
    }
}

function convertSrtToVtt(srtContent: string): string {
  let vttContent = "WEBVTT\n\n";

  const lines = srtContent.split("\n").filter((line) => line.trim() !== "");
  let inTimestamp = false;
  let lastLineWasEmpty = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    if (/^\d+$/.test(line.trim())) {
      continue;
    }

    if (line.includes("-->")) {
      if (!lastLineWasEmpty && vttContent !== "WEBVTT\n\n") {
        vttContent += "\n";
      }
      vttContent += line.replace(/,/g, ".") + "\n";
      inTimestamp = true;
      lastLineWasEmpty = false;
      continue;
    }

    if (line.trim() !== "") {
      vttContent += line + "\n";
      lastLineWasEmpty = false;
      inTimestamp = false;
    } else if (!lastLineWasEmpty && i < lines.length - 1) {
      vttContent += "\n";
      lastLineWasEmpty = true;
    }
  }

  return vttContent.trim() + "\n";
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
            
            writeStream.on('error', (error) => {
                console.error(`Error downloading ${objectKey} from S3:`, error);
                reject(error);
            });
        });
    } catch (error) {
        console.error(`Error downloading ${objectKey} from S3:`, error);
    }
}

async function uploadFile(filePath: string, bucketName: string, videoName: string, prefix: string = "") {
    try {
        const fileStream = fs.createReadStream(filePath);
        const fileName = path.basename(filePath);
        let key = `videos/${videoName}/`;
        key += prefix ? `${prefix}${fileName}` : "";

        const data = await s3Client.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: fileStream
            })
        )

        if (fileName.includes('index.m3u8') || fileName.includes('playlist.m3u8')) {
            const objectUrl = `https://s3.${process.env.AWS_REGION}.amazonaws.com/${bucketName}/${key}`;

            if (fileName.includes('playlist.m3u8')) {
                allLinks['playlist'] = objectUrl;
            } else {
                if (key.includes('360P')) {
                    allLinks['360P'] = objectUrl;
                } else if (key.includes('480P')) {
                    allLinks['480P'] = objectUrl;
                } else if (key.includes('720P')) {
                    allLinks['720P'] = objectUrl;
                } else if (key.includes('1080P')) {
                    allLinks['1080P'] = objectUrl;
                } else {
                    allLinks['unknown'] = objectUrl;
                }
            }
            console.log(`Uploaded playlist/index: ${objectUrl}`);
            return data;
        }
    } catch (error) {
        console.error('Error uploading file:', error);
    }
}

async function deleteObjectFromTempBucket(key:string) {
    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.TEMP_BUCKET_NAME || '',
            Key: key
        }));
        console.log(`Deleted ${key} from temp bucket`);
    } catch (error) {
        console.error(`Error deleting ${key} from temp bucket:`, error);
    }
    
}