import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

function r2Enabled() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

let client: S3Client | null = null;

function getClient() {
  if (!r2Enabled()) return null;
  if (client) return client;
  const account = process.env.R2_ACCOUNT_ID as string;
  client = new S3Client({
    region: "auto",
    endpoint: `https://${account}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
  });
  return client;
}

function bucket() {
  return process.env.R2_BUCKET || "";
}

export async function objectExists(key: string) {
  const c = getClient();
  if (!c) return false;
  try {
    await c.send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function putObject(params: { key: string; body: Uint8Array; contentType: string; cacheControl?: string }) {
  const c = getClient();
  if (!c) return false;
  await c.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: params.cacheControl || "public, max-age=86400",
    }),
  );
  return true;
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function getObject(params: { key: string }) {
  const c = getClient();
  if (!c) return null;
  try {
    const response = await c.send(new GetObjectCommand({ Bucket: bucket(), Key: params.key }));
    if (!response.Body) return null;
    const body = await streamToBuffer(response.Body);
    return {
      body,
      contentType: String(response.ContentType || "application/octet-stream"),
      cacheControl: String(response.CacheControl || "public, max-age=86400"),
    };
  } catch {
    return null;
  }
}

export function objectPublicUrl(key: string) {
  const base = (process.env.R2_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  if (!base) return "";
  return `${base}/${key.replace(/^\/+/, "")}`;
}

export function isObjectStoreEnabled() {
  return r2Enabled();
}
