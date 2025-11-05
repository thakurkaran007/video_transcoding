import type { Video } from '@prisma/client';
import * as z from 'zod';

export const putConfigSchema = z.object({
    userId: z.string().min(1).optional(),
    title: z.string().min(1),
    filename: z.string().min(1),
    contentType: z.string().min(1),
    description: z.string().min(1)
})

export const jobConfigSchema = z.object({
    filename: z.string().min(1),
    key: z.string().min(1),
    progress: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'QUEUED']),
});

export type ECSRequestBody = Pick<Video, 'objectKey' | 'progress' | 'videoResolutions' | 'thumbnailUrl' | 'subtitleUrl'>;

export type cookiesType = {
    [key: string]: {
        value: string | number;
        options: object
    }
}