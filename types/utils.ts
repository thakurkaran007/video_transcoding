import * as z from 'zod';

export const putConfigSchema = z.object({
    userId: z.string().min(1).optional(),
    title: z.string().min(1),
    filename: z.string().min(1),
    contentType: z.string().min(1),
    description: z.string().min(1)
})