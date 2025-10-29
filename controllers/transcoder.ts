import type { Request, Response } from 'express';
import { decrementKey, dequeueJobFromQueue, enqueueJobInQueue, getKey, getQueueLength, incrementKey, setKey } from '../redis';
import { REDIS_KEYS, VIDEO_PROGRESS_STATUS, type Video } from '@prisma/client';
import { db } from '../prisma';
import * as z from 'zod';
import type { jobConfigSchema } from '../types';
import { deleteObjectFile } from '../utils/s3SignedUrl';

export const handleS3Trigger = async (req: Request, res: Response) => {
    const { s3EventData }: any = req.body;

    if (!s3EventData) {
        return res.status(400).json({ error: 'Missing s3EventData in request body' });
    }

    try {
        const key = s3EventData.Records[0].s3.object.key;
        const metadata = s3EventData.Records[0].s3.object.metadata || {};

        const currentJobCount = parseInt(await getKey(REDIS_KEYS.VIDEO_PROCESSING_COUNT) || '0');
        const filename = key.split('/').pop().split('.')[0];

        const video = await db.video.create({
            data: {
                filename,
                objectKey: key,
                userId: metadata.userId,
                title: metadata.title || filename,
                description: metadata.description || '',
                type: metadata.type,
                videoResolution: metadata.videoResolution || '720p',
                thumbnailUrl: metadata.thumbnailUrl || '',
                subtitleUrl: metadata.subtitleUrl || '',
            },
        });

        if (!video) {
            return res.status(500).json({ error: 'Failed to create video record' });
        }

        if (currentJobCount < 5) {
            await incrementKey(REDIS_KEYS.VIDEO_PROCESSING_COUNT);

            const job: z.infer<typeof jobConfigSchema> = {
                filename,
                key,
                progress: VIDEO_PROGRESS_STATUS.PROCESSING,
            }

            // await trigger(job)
            
            await db.video.update({
                where: {
                    objectKey: key,
                },
                data: {
                    progress: VIDEO_PROGRESS_STATUS.PROCESSING,
                }
            })

            return res.status(200).json({ message: 'Video processing started', video });
        } else {
            console.log("Current job count exceeded 5:", currentJobCount);

            const job: z.infer<typeof jobConfigSchema> = {
                filename,
                key,
                progress: VIDEO_PROGRESS_STATUS.QUEUED,
            }
            
            await enqueueJobInQueue(job);
            console.log(`Transcoding job queued for ${filename}!`);

            await db.video.update({
                where: {
                    objectKey: key,
                },
                data: {
                    progress: VIDEO_PROGRESS_STATUS.QUEUED,
                }
            });

            return res.status(200).json({ message: 'Video job queued', video });
        }
    } catch (error) {
        console.error('Error processing S3 trigger:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const handleECSTrigger = async (req: Request, res: Response) => {
    type ECSRequestBody = Pick<Video, 'objectKey' | 'progress' | 'videoResolution' | 'thumbnailUrl' | 'subtitleUrl'>;

    const X : ECSRequestBody = req.body;

    if (!X.objectKey || !X.progress) {
        return res.status(400).json({ error: 'Missing required fields in request body' });
    }

    try {
        const video = await db.video.findUnique({
            where: {
                objectKey: X.objectKey
            }
        })
        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        if (X.progress === VIDEO_PROGRESS_STATUS.COMPLETED) {
            await deleteObjectFile(video.objectKey);
        }

        await db.video.update({
            where: {
                objectKey: X.objectKey
            },
            data: {
                progress: X.progress,
                thumbnailUrl: X.thumbnailUrl,
                subtitleUrl: X.subtitleUrl,
                videoResolution: X.videoResolution
            }
        });

        await decrementKey(REDIS_KEYS.VIDEO_PROCESSING_COUNT);

        const currentJobCount = parseInt(await getKey(REDIS_KEYS.VIDEO_PROCESSING_COUNT) || '0');
        const queueLength = await getQueueLength();

        if (queueLength == 0) {
            if (currentJobCount > 0) {
                await setKey(REDIS_KEYS.VIDEO_PROCESSING_COUNT, '0');
            }
            return res.status(200).json({ message: 'Trigger from ECS: Q is Empty' });
        }
        
        const availableSlots = 5 - currentJobCount;
        console.log(`Available slots for processing: ${availableSlots}`);

        for (let i = 0; i < availableSlots; i++) {
            const job = await dequeueJobFromQueue();

            if (!job) {
                break;
            }

            job.progress = VIDEO_PROGRESS_STATUS.PROCESSING;

            await db.video.update({
                where: {
                    objectKey: job.key,
                },
                data: {
                    progress: VIDEO_PROGRESS_STATUS.PROCESSING,
                }
            });

            await incrementKey(REDIS_KEYS.VIDEO_PROCESSING_COUNT);

            // await trigger(job)

            res.status(200).json({ message: 'Triggered next job from queue', job });
        }

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}   