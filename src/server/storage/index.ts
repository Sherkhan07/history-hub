import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";
import type { StorageDriver } from "./types";

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  if (driver) return driver;
  if (env.STORAGE_DRIVER === "s3") {
    if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error("S3 storage selected but S3_BUCKET / credentials are missing");
    }
    driver = new S3Storage(
      new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT || undefined,
        forcePathStyle: Boolean(env.S3_ENDPOINT),
        credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
      }),
      env.S3_BUCKET,
    );
  } else {
    driver = new LocalStorage(env.STORAGE_LOCAL_DIR);
  }
  return driver;
}

export { fileUrl } from "@/lib/files";
export type { StorageDriver };
