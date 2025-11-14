import type { formatType } from "./types.js";

import { parentPort, workerData } from "worker_threads";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import ffmpegPath from "ffmpeg-static";

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} else {
  throw new Error("ffmpeg binary not found: ffmpeg-static returned null");
}

const convertVideo = (format: formatType, folderPath: string, videoPath: string) => {
  return new Promise<void>((resolve, reject) => {
    const outputFolderPath = path.join(folderPath, format.name);
    if (!fs.existsSync(outputFolderPath)) {
      fs.mkdirSync(outputFolderPath, { recursive: true });
    }

    ffmpeg(videoPath)
      .outputOptions([
        "-profile:v baseline",
        "-level 3.0",
        `-vf scale=${format.scale}`,
        "-start_number 0",
        "-hls_time 10",
        "-hls_list_size 0",
        `-hls_segment_filename ${path.join(outputFolderPath, "index%d.ts")}`,
        "-f hls",
      ])
      .output(path.join(outputFolderPath, "index.m3u8"))
      .on("end", () => {  
        console.log(`Video converted to ${format.name} successfully!`);
        resolve();
      })
      .on("error", (error: any) => {
        console.error(`Error converting video to ${format.name}`);
        reject(error);
      })
      .run();
  });
};

const { format, folderPath, videoPath } = workerData;

convertVideo(format, folderPath, videoPath)
  .then(() => {
    if (parentPort) {
      parentPort.postMessage({ status: "success" });
    } else {
      // parentPort is null in this context; log instead of posting
      console.warn("parentPort is null: cannot post success message");
    }
  })
  .catch((error) => {
    if (parentPort) {
      parentPort.postMessage({ status: "error", error: error.message });
    } else {
      // parentPort is null in this context; log the error
      console.error("parentPort is null: error occurred", error);
    }
  });