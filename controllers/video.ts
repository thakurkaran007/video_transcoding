import type { Request } from 'express';
import type { Response } from 'express';
import { putConfigSchema } from '../types/utils';
import { generateUrlToPutObject } from '../utils/s3SignedUrl';
import { db } from '../prisma';

async function uploadVideoToS3(req: Request, res: Response) {
    const validatedData = putConfigSchema.parse(req.body);

    if (!validatedData) {
        return res.status(400).json({ error: 'Invalid input data' });
    }
    //@ts-ignore
    const signedUrl = await generateUrlToPutObject({...validatedData, userId: req.id });

    return res.status(200).json({
        status: 'success',
        url: signedUrl
    });
} 

async function getVideoFromS3(req: Request, res: Response) {
    const video = await db.video.findUnique({
        where: {
            id: req.params.id
        }
    })

    if (!video) {
        return res.status(404).json({ error: 'Video not found' });
    }
    
    return res.status(200).json({
        status: 'success',
        data: {
            video
        }
    })
}

async function getVideoStatus(req: Request, res: Response) {
    const video = await db.video.findUnique({
        where: {
            id: req.params.id
        }
    })

    if (!video) {
        return res.status(404).json({ error: 'Video not found' });
    }

    return res.status(200).json({
        status: 'success',
        progress: video.progress
    })
}

async function getAllVideos(req: Request, res: Response) {
    const videos = await db.video.findMany({
        where: {
            //@ts-ignore
            userId: req.id
        }
    })
    
    return res.status(200).json({   
        status: 'success',
        data: {
            videos
        }
    })
}

async function updateViewsCount(req: Request, res: Response) {
    const video = await db.video.update({
        where: {
            id: req.params.id
        },
        data: {
            viewCount: {
                increment: 1
            }
        }
    })
    if (!video) {
        return res.status(404).json({ error: 'Video not found' });
    }

    return res.status(200).json({
        status: 'success',
        data: {
            video
        }
    })
}