export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  size: number;
  contentType?: string;
};

export type ByteRange = { start: number; end: number };

/**
 * Storage abstraction. Keys are POSIX-like paths: "lessons/<lessonId>/<resourceId>/v1/original.pptx".
 * Keys starting with "public/" are served without authentication (game images shown to anonymous
 * live-session participants). Everything else is served through /api/files with RBAC checks.
 */
export interface StorageDriver {
  put(key: string, data: Buffer, contentType?: string): Promise<void>;
  get(key: string, range?: ByteRange): Promise<StoredObject | null>;
  stat(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
}
