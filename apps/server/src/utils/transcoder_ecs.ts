import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import * as z from "zod";
import type { jobConfigSchema } from "../types/index.js";

const ecsClient = new ECSClient({
    region: process.env.MY_AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY || ""
    }
});

const config = {
    CLUSTER: process.env.CLUSTER,
    TASK: process.env.TASK
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
                    assignPublicIp: "DISABLED",  
                    securityGroups: listOfSecurityGroups
                }
            },
            overrides: {
                containerOverrides: [
                  {
                    name: process.env.ECS_CONTAINER_NAME,
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
                        name: "CDN_DISTRIBUTION_DOMAIN",
                        value: process.env.CDN_DISTRIBUTION_DOMAIN,
                      }
                      // {
                      //   name: "THUMBNAIL_API_ENDPOINT",
                      //   value: process.env.THUMBNAIL_API_ENDPOINT,
                      // }
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
        console.log("ECS task triggered successfully");
    } catch (error) {
        console.error("Error triggering ECS task:", error);
    }
}

export default triggerTranscodingJob;