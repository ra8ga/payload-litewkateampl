import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";

const endpoint = process.env.R2_S3_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

const bucket = process.argv[2];
const outFile = process.argv[3];
const prefix = process.argv[4] || "";

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error("Missing R2_S3_ENDPOINT, R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY env vars.");
  process.exit(2);
}
if (!bucket || !outFile) {
  console.error("Usage: node list-s3-keys.mjs <bucket> <outFile> [prefix]");
  process.exit(2);
}

const s3 = new S3Client({
  region: "auto",
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

async function listAllKeys() {
  const keys = [];
  let ContinuationToken = undefined;
  while (true) {
    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    if (!res.IsTruncated) break;
    ContinuationToken = res.NextContinuationToken;
  }
  return keys;
}

const keys = await listAllKeys();
await fs.promises.mkdir(path.dirname(outFile), { recursive: true });
await fs.promises.writeFile(outFile, keys.join("\n") + "\n", "utf8");
console.log(`Listed ${keys.length} keys to ${outFile}`);