import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { extractSlideImages, inspectPptx } from "@/features/resources/server/pptx";

async function buildPptx(slides: ("image" | "text")[]): Promise<Buffer> {
  const zip = new JSZip();
  const ids = slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${10 + i}"/>`).join("");
  zip.file("ppt/presentation.xml", `<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst>${ids}</p:sldIdLst><p:sldSz cx="1000" cy="500"/></p:presentation>`);
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    `<Relationships>${slides.map((_, i) => `<Relationship Id="rId${10 + i}" Target="slides/slide${i + 1}.xml"/>`).join("")}</Relationships>`,
  );
  slides.forEach((kind, i) => {
    const n = i + 1;
    if (kind === "image") {
      zip.file(`ppt/slides/slide${n}.xml`, `<p:sld><p:cSld><p:spTree><p:pic><p:blipFill><a:blip r:embed="rId2"/></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1000" cy="500"/></a:xfrm></p:spPr></p:pic></p:spTree></p:cSld></p:sld>`);
      zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, `<Relationships><Relationship Id="rId2" Target="../media/image${n}.png"/></Relationships>`);
      zip.file(`ppt/media/image${n}.png`, Buffer.from(`PNG-${n}`));
    } else {
      zip.file(`ppt/slides/slide${n}.xml`, `<p:sld><p:cSld><p:spTree><p:sp><a:t>Ботай мәдениеті</a:t></p:sp></p:spTree></p:cSld></p:sld>`);
      zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, `<Relationships></Relationships>`);
    }
  });
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("PPTX inspector", () => {
  it("detects image-only decks and extracts slides in order", async () => {
    const buf = await buildPptx(["image", "image", "image"]);
    const info = await inspectPptx(buf);
    expect(info.slideCount).toBe(3);
    expect(info.imageOnly).toBe(true);
    const imgs = await extractSlideImages(buf, info);
    expect(imgs.map((b) => b.toString())).toEqual(["PNG-1", "PNG-2", "PNG-3"]);
  });
  it("flags text slides as not image-only", async () => {
    const info = await inspectPptx(await buildPptx(["image", "text"]));
    expect(info.imageOnly).toBe(false);
    expect(info.slides[1].text).toContain("Ботай");
  });
  it("rejects non-presentation zips", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", "<w/>");
    await expect(inspectPptx(await zip.generateAsync({ type: "nodebuffer" }))).rejects.toThrow();
  });
});
