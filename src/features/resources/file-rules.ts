import type { ResourceType } from "@/generated/prisma/enums";

export type FileKind = "pptx" | "ppt" | "pdf" | "docx" | "doc" | "image" | "video";

export const FILE_KINDS: Record<string, { kind: FileKind; mime: string }> = {
  pptx: { kind: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  ppt: { kind: "ppt", mime: "application/vnd.ms-powerpoint" },
  pdf: { kind: "pdf", mime: "application/pdf" },
  docx: { kind: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  doc: { kind: "doc", mime: "application/msword" },
  png: { kind: "image", mime: "image/png" },
  jpg: { kind: "image", mime: "image/jpeg" },
  jpeg: { kind: "image", mime: "image/jpeg" },
  webp: { kind: "image", mime: "image/webp" },
  mp4: { kind: "video", mime: "video/mp4" },
  webm: { kind: "video", mime: "video/webm" },
};

export const ACCEPT_ATTR = Object.keys(FILE_KINDS)
  .map((e) => `.${e}`)
  .join(",");

export const DEFAULT_MAX_UPLOAD_MB = 100;

export function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

/** Verifies the file's leading bytes match its extension (prevents renamed executables etc.). */
export function matchesSignature(kind: FileKind, head: Uint8Array): boolean {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => head[offset + i] === b);
  switch (kind) {
    case "pptx":
    case "docx":
      return startsWith([0x50, 0x4b, 0x03, 0x04]);
    case "ppt":
    case "doc":
      return startsWith([0xd0, 0xcf, 0x11, 0xe0]);
    case "pdf":
      return startsWith([0x25, 0x50, 0x44, 0x46]);
    case "image":
      return (
        startsWith([0x89, 0x50, 0x4e, 0x47]) || // png
        startsWith([0xff, 0xd8, 0xff]) || // jpeg
        (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) // webp
      );
    case "video":
      return startsWith([0x66, 0x74, 0x79, 0x70], 4) || startsWith([0x1a, 0x45, 0xdf, 0xa3]);
  }
}

/** Best guess for the resource type from the file name — the moderator can change it. */
export function guessResourceType(name: string): ResourceType {
  const n = name.toLowerCase();
  const ext = extensionOf(n);
  if (/(рабоч|worksheet|жұмыс пара)/.test(n)) return "WORKSHEET";
  if (/(домаш|homework|үй тапс)/.test(n)) return "HOMEWORK";
  if (/(метод|guide|нұсқау)/.test(n)) return "TEACHER_GUIDE";
  if (/(карта|map|карта)/.test(n)) return "MAP";
  if (ext === "pptx" || ext === "ppt") return "PRESENTATION";
  if (ext === "mp4" || ext === "webm") return "VIDEO";
  if (ext === "pdf" || ext === "docx" || ext === "doc") return "WORKSHEET";
  return "ADDITIONAL";
}
