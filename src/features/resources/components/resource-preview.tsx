"use client";

import { Download } from "lucide-react";
import type { PreviewKind } from "@/generated/prisma/enums";
import { fileUrl } from "@/lib/files";
import { SlideViewer } from "./slide-viewer";
import { useDict } from "@/i18n/provider";

export type PreviewResource = {
  id: string;
  title: string;
  previewKind: PreviewKind;
  previewPages: string[];
  fileUrl: string | null;
  externalUrl: string | null;
  /** `{ pdfPage }` opens a shared PDF (e.g. the textbook) at that page */
  content?: unknown;
};

function pdfStartPage(content: unknown): number | null {
  const page = (content as { pdfPage?: unknown } | null)?.pdfPage;
  return typeof page === "number" && page > 0 ? page : null;
}

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

/** Chooses the right in-browser viewer for a resource; falls back to "download original". */
export function ResourcePreview({ resource, range, captureKeys = true }: { resource: PreviewResource; range?: [number, number]; captureKeys?: boolean }) {
  const t = useDict();
  const pages = resource.previewPages.map((k) => fileUrl(k)!);
  switch (resource.previewKind) {
    case "IMAGES":
      return <SlideViewer pages={pages} title={resource.title} range={range} captureKeys={captureKeys} />;
    case "PDF": {
      const page = range?.[0] ?? pdfStartPage(resource.content);
      return (
        <iframe
          key={page ?? 0}
          src={`${pages[0]}#${page ? `page=${page}&` : ""}view=FitH`}
          title={resource.title}
          className="h-[80vh] w-full rounded-2xl border bg-card"
        />
      );
    }
    case "VIDEO":
      return (
        <video src={pages[0]} controls preload="metadata" className="aspect-video w-full rounded-2xl bg-ink">
          <track kind="captions" />
        </video>
      );
    default: {
      const embed = resource.externalUrl ? youtubeEmbed(resource.externalUrl) : null;
      if (embed) {
        return <iframe src={embed} title={resource.title} className="aspect-video w-full rounded-2xl" allow="fullscreen; picture-in-picture" />;
      }
      return (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
          <p className="text-muted-foreground">{t.viewer.noPreview}</p>
          {resource.fileUrl && (
            <a href={`${fileUrl(resource.fileUrl)}?download=1`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-steppe px-5 font-medium text-white">
              <Download className="size-4" /> {t.viewer.downloadOriginal}
            </a>
          )}
          {resource.externalUrl && (
            <a href={resource.externalUrl} target="_blank" rel="noopener noreferrer" className="text-steppe underline">
              {t.viewer.openLink}
            </a>
          )}
        </div>
      );
    }
  }
}
