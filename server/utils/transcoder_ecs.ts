import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import * as z from "zod";
import type { jobConfigSchema } from "../types";

const ecsClient = new ECSClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
    }
});

const config = {
    CLUSTER: process.env.ECS_CLUSTER_NAME,
    TASK: process.env.ECS_TASK_DEFINITION
}

const listOfSubnets = process.env.SUBNETS ? process.env.SUBNETS.split(",") : [];
const listOfSecurityGroups = process.env.SECURITY_GROUPS ? process.env.SECURITY_GROUPS.split(",") : [];


async function triggerTranscodingJob(job: z.infer<typeof jobConfigSchema>) {
    try {
        const command = new RunTaskCommand({
            cluster: config.CLUSTER,
            taskDefinition: config.TASK,
            launchType: "FARGATE",
            count: 1,
            networkConfiguration: {
                awsvpcConfiguration: {
                    subnets: listOfSubnets,
                    assignPublicIp: "ENABLED",
                    securityGroups: listOfSecurityGroups
                }
            },
            overrides: {
                containerOverrides: [
                  {
                    name: "video-transcoding-service-image",
                    environment: [
                      { name: "OBJECT_KEY", value: job.key },
                      {
                        name: "TEMP_S3_BUCKET_NAME",
                        value: process.env.TEMP_S3_BUCKET_NAME,
                      },
                      {
                        name: "FINAL_S3_BUCKET_NAME",
                        value: process.env.FINAL_S3_BUCKET_NAME,
                      },
                      {
                        name: "MY_AWS_REGION",
                        value: process.env.MY_AWS_REGION,
                      },
                      {
                        name: "MY_AWS_ACCESS_KEY_ID",
                        value: process.env.MY_AWS_ACCESS_KEY_ID,
                      },
                      {
                        name: "MY_AWS_SECRET_ACCESS_KEY",
                        value: process.env.MY_AWS_SECRET_ACCESS_KEY,
                      },
                      { name: "WEBHOOK_URL", value: process.env.WEBHOOK_URL },
                      {
                        name: "THUMBNAIL_API_ENDPOINT",
                        value: process.env.THUMBNAIL_API_ENDPOINT,
                      },
                      {
                        name: "SUBTITLE_API_ENDPOINT",
                        value: process.env.SUBTITLE_API_ENDPOINT,
                      },
                    ],
                  },
                ],
            },
            tags: [{
              key: "Purpose",
              value: "Video Transcoding",
            }]
        })
        await ecsClient.send(command);
    } catch (error) {
        console.error("Error triggering ECS task:", error);
    }
}

export default triggerTranscodingJob;