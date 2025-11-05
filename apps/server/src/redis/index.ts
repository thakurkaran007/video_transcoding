import Redis from "ioredis";
import * as z from "zod";
import { REDIS_KEYS } from "@prisma/client";
import type { jobConfigSchema } from "../types";


const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: 6379
});

export async function enqueueJobInQueue(job: z.infer<typeof jobConfigSchema>) {
    return await redis.lpush(REDIS_KEYS.VIDEO_PROCESSING_QUEUE, JSON.stringify(job));
}

export async function dequeueJobFromQueue()  {
    const job = await redis.rpop(REDIS_KEYS.VIDEO_PROCESSING_QUEUE);
    return job ? JSON.parse(job) : null;
}

export async function getKey(key: string) {
    return await redis.get(key);
}

export async function incrementKey(key: string) {
    return await redis.incr(key);
}

export async function decrementKey(key: string) {
    return await redis.decr(key);
}

export async function deleteKey(key: string) {
    return await redis.del(key);
}

export async function getQueueLength() {
    return await redis.llen(REDIS_KEYS.VIDEO_PROCESSING_QUEUE);
}

export async function deleteAllKeys() {
    return await redis.flushall();
}

export async function setKey(key: string, value: string, options: { EX?: number; NX?: boolean } = {}) {
    if (!redis) return;

    try {
        const defaultOptions = {
            EX: 0, // Expiration time in seconds, 0 means no expiration
            NX: false // Only set the key if it does not already exist
        }
        const finalOptions = { ...defaultOptions, ...options };
        const params: string[] = [key, value];

        if (finalOptions.EX > 0) {
            params.push("EX", String(finalOptions.EX));
        }

        if (finalOptions.NX) {
            params.push("NX");
        }

        const res = await (redis as any).set(...params);

        if (res !== "OK") {
            throw new Error(`Failed to set key: ${key}`);
        }
        return true;
    } catch (error) {
        console.error("Error setting key in Redis:", error);
    }
}
