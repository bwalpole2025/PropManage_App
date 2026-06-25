import type { DocumentStorage, PutResult } from "../types";

// S3-compatible storage (AWS S3 / MinIO / R2). Selected via STORAGE_DRIVER=s3.
// The AWS SDK is imported lazily so the default mock path never loads it.
export class S3Storage implements DocumentStorage {
  readonly driverName = "s3";
  private bucket = process.env.S3_BUCKET ?? "propmanage-files";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private clientPromise: Promise<any> | null = null;

  private async client() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { S3Client } = await import("@aws-sdk/client-s3");
        return new S3Client({
          region: process.env.S3_REGION ?? "eu-west-2",
          endpoint: process.env.S3_ENDPOINT || undefined,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
          credentials:
            process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
              ? {
                  accessKeyId: process.env.S3_ACCESS_KEY_ID,
                  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
                }
              : undefined,
        });
      })();
    }
    return this.clientPromise;
  }

  async put(
    key: string,
    bytes: Uint8Array | Buffer,
    contentType: string,
  ): Promise<PutResult> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    const body = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return { key, sizeBytes: body.byteLength };
  }

  async getSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = await this.client();
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
  }

  async getBytes(key: string): Promise<Uint8Array> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    const res = await client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await res.Body.transformToByteArray();
    return bytes as Uint8Array;
  }

  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    await client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async exists(key: string): Promise<boolean> {
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
