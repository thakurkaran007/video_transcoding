import type { Request, Response } from "express";
import { putConfigSchema } from "../types/index.js";
import { db } from "../db.js";
import { generateUrlToPutObject } from "../utils/s3SignedUrl.js";


export async function uploadVideoToS3(req: Request, res: Response) {
  try {
    const validatedData = putConfigSchema.safeParse(req.body);

    if (!validatedData.success) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    const signedUrl = await generateUrlToPutObject({
      ...validatedData.data,
      userId: (req as any).userId,
    });

    return res.status(200).json({
      status: "success",
      url: signedUrl,
    });
  } catch (error) {
    console.error("❌ Error in uploadVideoToS3:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getVideo(req: Request, res: Response) {
  try {
    const video = await db.video.findUnique({
      where: { id: req.params.id },
       select: {
      id: true,
      title: true,
      userId: true,
      description: true,
      thumbnailUrl: true,
      viewCount: true,
      createdAt: true,
      filename: true,
      progress: true,
      subtitleUrl: true,
      type: true,
      objectKey: true,
      videoResolutions: true,
      isPublic: true,
      user: true
      },
    });

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }
    const key = video.objectKey.split("/").pop()?.split(".")[0];
    if (!key) {
      console.log("Key undefined while making cookies");
      return;
    }
    
    return res.status(200).json({
      status: "success",
      data: { video },
    });
  } catch (error) {
    console.error("❌ Error in getVideo:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getVideoStatus(req: Request, res: Response) {
  try {
    const video = await db.video.findUnique({
      where: { id: req.params.id },
    });

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    return res.status(200).json({
      status: "success",
      progress: video.progress,
    });
  } catch (error) {
    console.error("❌ Error in getVideoStatus:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export const getUserAllVideos = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;

    const videos = await db.video.findMany({
      where: { userId },
      select: {
      id: true,
      title: true,
      userId: true,
      description: true,
      thumbnailUrl: true,
      viewCount: true,
      createdAt: true,
      filename: true,
      progress: true,
      subtitleUrl: true,
      type: true,
      objectKey: true,
      videoResolutions: true,
      isPublic: true,
      user: true
      },
    });

    return res.status(200).json({
      status: "success",
      data: { videos },
    });
  } catch (error) {
    console.error("❌ Error in getUserAllVideos:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAllVideos(req: Request, res: Response) {
  try {
    const videos = await db.video.findMany({
      select: {
      id: true,
      title: true,
      userId: true,
      description: true,
      thumbnailUrl: true,
      viewCount: true,
      createdAt: true,
      filename: true,
      progress: true,
      subtitleUrl: true,
      type: true,
      objectKey: true,
      videoResolutions: true,
      isPublic: true,
      user: true
      },
    });

    return res.status(200).json({
      status: "success",
      data: { videos },
    });
  } catch (error) {
    console.error("❌ Error in getAllVideos:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateViewsCount(req: Request, res: Response) {
  try {
    const video = await db.video.update({
      where: { id: req.params.id },
      data: { viewCount: { increment: 1 } },
    });

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    return res.status(200).json({
      status: "success",
      data: { video },
    });
  } catch (error) {
    console.error("❌ Error in updateViewsCount:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}