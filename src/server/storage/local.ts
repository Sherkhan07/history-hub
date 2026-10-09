import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { ByteRange, StorageDriver, StoredObject } from "./types";

export class LocalStorage implements StorageDriver {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(key: string): string {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  async stat(key: string) {
    try {
      const s = await stat(this.resolve(key));
      return s.isFile() ? { size: s.size } : null;
    } catch {
      return null;
    }
  }

  async get(key: string, range?: ByteRange): Promise<StoredObject | null> {
    const info = await this.stat(key);
    if (!info) return null;
    const stream = createReadStream(this.resolve(key), range ? { start: range.start, end: range.end } : undefined);
    return {
      body: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
      size: range ? range.end - range.start + 1 : info.size,
    };
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  async deletePrefix(prefix: string): Promise<void> {
    const full = this.resolve(prefix.replace(/\/+$/, ""));
    await rm(full, { recursive: true, force: true });
  }
}
