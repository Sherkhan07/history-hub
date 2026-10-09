import "server-only";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import type { PreviewKind } from "@/generated/prisma/enums";
import { env } from "@/lib/env";
import type { MsgKey, MsgVars } from "@/i18n/msg";
import { storage } from "@/server/storage";
import { FILE_KINDS, extensionOf, matchesSignature, type FileKind } from "../file-rules";
import { extractSlideImages, inspectPptx } from "./pptx";

const run = promisify(execFile);

export type ProcessedFile = {
  fileUrl: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  previewKind: PreviewKind;
  previewPages: string[];
  previewUrl: string | null;
  pageCount: number | null;
};

export class UploadValidationError extends Error {
  constructor(
    public readonly key: MsgKey,
    public readonly vars?: MsgVars,
  ) {
    super(key);
  }
}

export function validateUpload(name: string, data: Buffer, maxBytes: number): { kind: FileKind; mime: string; ext: string } {
  const ext = extensionOf(name);
  const rule = FILE_KINDS[ext];
  if (!rule) throw new UploadValidationError("formatUnsupported", { ext: ext || "?" });
  if (data.byteLength === 0) throw new UploadValidationError("fileEmpty");
  if (data.byteLength > maxBytes) {
    throw new UploadValidationError("fileTooBig", { mb: Math.round(maxBytes / 1024 / 1024) });
  }
  if (!matchesSignature(rule.kind, data.subarray(0, 16))) {
    throw new UploadValidationError("fileMismatch");
  }
  return { kind: rule.kind, mime: rule.mime, ext };
}

/** Storage prefix for one resource version. Versioned so caches never serve stale previews. */
export function resourcePrefix(lessonId: string, resourceId: string, version: number) {
  return `lessons/${lessonId}/${resourceId}/v${version}`;
}

async function toWebp(input: Buffer, width: number, quality = 80): Promise<Buffer> {
  return sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
}

async function convertWithSoffice(data: Buffer, ext: string): Promise<Buffer | null> {
  if (!env.SOFFICE_PATH) return null;
  const dir = await mkdtemp(path.join(tmpdir(), "hh-"));
  try {
    const input = path.join(dir, `source.${ext}`);
    await writeFile(input, data);
    await run(env.SOFFICE_PATH, ["--headless", "--convert-to", "pdf", "--outdir", dir, input], { timeout: 120_000 });
    return await readFile(path.join(dir, "source.pdf"));
  } catch (e) {
    console.error("soffice conversion failed", e);
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function countPdfPages(pdf: Buffer): number | null {
  const matches = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : null;
}

/**
 * Stores the untouched original and builds a browser-friendly preview:
 *  - image-only PPTX → one WebP per slide (exact rendering)
 *  - other PPTX/DOCX → PDF via LibreOffice when SOFFICE_PATH is configured
 *  - PDF → native browser viewer
 *  - images → WebP; video → <video>
 */
export async function processUpload(opts: {
  lessonId: string;
  resourceId: string;
  version: number;
  name: string;
  data: Buffer;
  maxBytes: number;
}): Promise<ProcessedFile> {
  const { kind, mime, ext } = validateUpload(opts.name, opts.data, opts.maxBytes);
  const prefix = resourcePrefix(opts.lessonId, opts.resourceId, opts.version);
  const store = storage();
  const originalKey = `${prefix}/original.${ext}`;
  await store.put(originalKey, opts.data, mime);

  const result: ProcessedFile = {
    fileUrl: originalKey,
    originalName: opts.name.slice(0, 250),
    mimeType: mime,
    fileSize: opts.data.byteLength,
    previewKind: "NONE",
    previewPages: [],
    previewUrl: null,
    pageCount: null,
  };

  if (kind === "pptx") {
    const info = await inspectPptx(opts.data);
    result.pageCount = info.slideCount;
    if (info.imageOnly) {
      const images = await extractSlideImages(opts.data, info);
      const keys: string[] = [];
      for (const [i, img] of images.entries()) {
        const key = `${prefix}/slides/${String(i + 1).padStart(3, "0")}.webp`;
        await store.put(key, await toWebp(img, 1920, 82), "image/webp");
        keys.push(key);
      }
      result.previewKind = "IMAGES";
      result.previewPages = keys;
      const coverKey = `${prefix}/cover.webp`;
      await store.put(coverKey, await toWebp(images[0], 640, 75), "image/webp");
      result.previewUrl = coverKey;
    } else {
      const pdf = await convertWithSoffice(opts.data, ext);
      if (pdf) {
        const key = `${prefix}/preview.pdf`;
        await store.put(key, pdf, "application/pdf");
        result.previewKind = "PDF";
        result.previewPages = [key];
      }
    }
  } else if (kind === "pdf") {
    result.previewKind = "PDF";
    result.previewPages = [originalKey];
    result.pageCount = countPdfPages(opts.data);
  } else if (kind === "docx" || kind === "doc" || kind === "ppt") {
    const pdf = await convertWithSoffice(opts.data, ext);
    if (pdf) {
      const key = `${prefix}/preview.pdf`;
      await store.put(key, pdf, "application/pdf");
      result.previewKind = "PDF";
      result.previewPages = [key];
      result.pageCount = countPdfPages(pdf);
    }
  } else if (kind === "image") {
    const key = `${prefix}/preview.webp`;
    await store.put(key, await toWebp(opts.data, 1920), "image/webp");
    const coverKey = `${prefix}/cover.webp`;
    await store.put(coverKey, await toWebp(opts.data, 640, 75), "image/webp");
    result.previewKind = "IMAGES";
    result.previewPages = [key];
    result.previewUrl = coverKey;
    result.pageCount = 1;
  } else if (kind === "video") {
    result.previewKind = "VIDEO";
    result.previewPages = [originalKey];
  }

  return result;
}
