import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import type { putConfigSchema } from '../types/utils';


const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
})

async function getObjectMetadata(key: string) {
    try {
        const command = new HeadObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
        });
        const response = await s3Client.send(command);
        return response;
    } catch (error) {
        console.error('Error fetching object metadata:', error);
    }
}

async function generateUrlToPutObject(config: z.infer<typeof putConfigSchema>) {
    try {
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `uploads/videos/${config.filename}`,
            ContentType: config.contentType,
            Metadata: {
                userId: config.userId || '',
                title: config.title,
                description: config.description
            }
        })
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return signedUrl;
    } catch (error) {
        console.error('Error generating signed URL for PUT:', error);   
    }
}

async function deleteObjectFile(key: string) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
        });
        await s3Client.send(command);
    } catch (error) {
        console.error('Error deleting object file:', error);
    }
}

export { getObjectMetadata, generateUrlToPutObject, deleteObjectFile };