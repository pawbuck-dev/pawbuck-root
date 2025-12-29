import { GetObjectCommand, S3Client } from "npm:@aws-sdk/client-s3";
import type { S3Config } from "./types.ts";

/**
 * Fetches email file from S3 bucket
 */
export async function fetchEmailFromS3(
  config: S3Config
): Promise<Uint8Array> {
  const { bucket, fileKey } = config;

  console.log(`Reading from S3 bucket: ${bucket}, key: ${fileKey}`);

  // Initialize S3 client
  const s3Client = new S3Client({
    region: Deno.env.get("AWS_REGION") || "us-east-1",
    credentials: {
      accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
      secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
    },
  });

  // Get object from S3
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: fileKey,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error("No data in S3 response");
  }

  // Convert the readable stream to Uint8Array
  const rawEmail = await response.Body.transformToByteArray();

  console.log("Email size:", rawEmail.length, "bytes");

  return rawEmail;
}


