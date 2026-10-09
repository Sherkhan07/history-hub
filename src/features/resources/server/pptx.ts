import JSZip from "jszip";

/**
 * Lightweight PPTX inspector.
 *
 * Browsers cannot render PPTX natively. Many modern decks (NotebookLM, Canva exports, scans)
 * consist of one full-bleed picture per slide — for those we can build a perfect preview by
 * extracting the slide pictures in presentation order, without touching the original file.
 *
 * For "real" decks with text/shapes the caller falls back to a PDF conversion (LibreOffice, if
 * configured) or to "download original".
 */

export type PptxSlide = {
  index: number; // 1-based, presentation order
  /** Path inside the zip of the full-slide picture, when the slide is image-only */
  imagePath: string | null;
  text: string;
};

export type PptxInspection = {
  slideCount: number;
  imageOnly: boolean;
  slides: PptxSlide[];
};

const REL_TARGET = /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g;
const REL_TARGET_ALT = /<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*\bId="([^"]+)"/g;

function parseRels(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of xml.matchAll(REL_TARGET)) map.set(m[1], m[2]);
  for (const m of xml.matchAll(REL_TARGET_ALT)) if (!map.has(m[2])) map.set(m[2], m[1]);
  return map;
}

function resolvePath(baseDir: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = baseDir.split("/").filter(Boolean);
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

function decodeXmlText(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export async function inspectPptx(data: Buffer | Uint8Array | ArrayBuffer): Promise<PptxInspection> {
  const zip = await JSZip.loadAsync(data);
  const presXml = await zip.file("ppt/presentation.xml")?.async("string");
  const presRelsXml = await zip.file("ppt/_rels/presentation.xml.rels")?.async("string");
  if (!presXml || !presRelsXml) throw new Error("Not a PPTX presentation");

  const sizeMatch = presXml.match(/<p:sldSz[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
  const slideW = sizeMatch ? Number(sizeMatch[1]) : 0;
  const slideH = sizeMatch ? Number(sizeMatch[2]) : 0;

  const presRels = parseRels(presRelsXml);
  const order = [...presXml.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)].map((m) => m[1]);

  const slides: PptxSlide[] = [];
  for (const [i, rid] of order.entries()) {
    const target = presRels.get(rid);
    if (!target) continue;
    const slidePath = resolvePath("ppt", target);
    const slideXml = (await zip.file(slidePath)?.async("string")) ?? "";
    const slideDir = slidePath.split("/").slice(0, -1).join("/");
    const relsPath = `${slideDir}/_rels/${slidePath.split("/").pop()}.rels`;
    const rels = parseRels((await zip.file(relsPath)?.async("string")) ?? "");

    const text = [...slideXml.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
      .map((m) => decodeXmlText(m[1]))
      .join(" ")
      .trim();

    // Find the largest picture on the slide
    let best: { path: string; area: number } | null = null;
    for (const pic of slideXml.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g)) {
      const embed = pic[1].match(/r:embed="([^"]+)"/)?.[1];
      const ext = pic[1].match(/<a:ext\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
      if (!embed || !ext) continue;
      const relTarget = rels.get(embed);
      if (!relTarget) continue;
      const area = Number(ext[1]) * Number(ext[2]);
      if (!best || area > best.area) best = { path: resolvePath(slideDir, relTarget), area };
    }

    const slideArea = slideW * slideH;
    const coversSlide = best !== null && slideArea > 0 && best.area / slideArea >= 0.85;
    const shapeCount = (slideXml.match(/<p:sp>/g) ?? []).length;
    const imageOnly = coversSlide && text.length === 0 && shapeCount === 0;

    slides.push({ index: i + 1, imagePath: imageOnly && best ? best.path : null, text });
  }

  return {
    slideCount: slides.length,
    imageOnly: slides.length > 0 && slides.every((s) => s.imagePath !== null),
    slides,
  };
}

/** Reads the raw bytes of every slide picture, in order. Only valid when `imageOnly`. */
export async function extractSlideImages(
  data: Buffer | Uint8Array | ArrayBuffer,
  inspection?: PptxInspection,
): Promise<Buffer[]> {
  const zip = await JSZip.loadAsync(data);
  const info = inspection ?? (await inspectPptx(data));
  const out: Buffer[] = [];
  for (const slide of info.slides) {
    if (!slide.imagePath) throw new Error(`Slide ${slide.index} is not image-only`);
    const file = zip.file(slide.imagePath);
    if (!file) throw new Error(`Image for slide ${slide.index} not found`);
    out.push(await file.async("nodebuffer"));
  }
  return out;
}
