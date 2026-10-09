/**
 * Re-creates missing stored originals and previews for resources from the materials folder.
 * Files are matched by size + extension, then processed with the same lesson/resource/version,
 * so storage keys stay identical. Useful after wiping local storage or moving to S3.
 *
 *   npm run media:rebuild            # only resources whose original is missing
 *   npm run media:rebuild -- --all   # rebuild every preview
 */
import "dotenv/config";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { storage } from "../src/server/storage";
import { processUpload } from "../src/features/resources/server/process";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const dir = path.resolve(process.cwd(), process.env.MATERIALS_DIR ?? "..");
const all = process.argv.includes("--all");

async function main() {
  const index = readdirSync(dir)
    .filter((f) => !f.startsWith("~$") && statSync(path.join(dir, f)).isFile())
    .map((f) => ({ file: f, size: statSync(path.join(dir, f)).size, ext: path.extname(f).slice(1).toLowerCase() }));
  const resources = await db.resource.findMany({ where: { fileUrl: { not: null } } });
  let rebuilt = 0;
  let missing = 0;
  for (const r of resources) {
    // Shared library files are restored by `npm run textbook:import`
    if (r.fileUrl!.startsWith("library/")) continue;
    if (!all && (await storage().stat(r.fileUrl!))) continue;
    const ext = r.fileUrl!.split(".").pop()!.toLowerCase();
    const src = index.find((f) => f.size === r.fileSize && f.ext === ext);
    if (!src) {
      console.warn(`  ! no source for "${r.title}" (${r.originalName}, ${r.fileSize} bytes)`);
      missing++;
      continue;
    }
    const processed = await processUpload({
      lessonId: r.lessonId,
      resourceId: r.id,
      version: r.version,
      name: r.originalName ?? src.file,
      data: readFileSync(path.join(dir, src.file)),
      maxBytes: 500 * 1024 * 1024,
    });
    await db.resource.update({ where: { id: r.id }, data: processed });
    console.log(`  ✓ ${r.title} ← ${src.file} (${processed.previewKind}${processed.pageCount ? `, ${processed.pageCount}` : ""})`);
    rebuilt++;
  }
  console.log(`Rebuilt ${rebuilt}, unresolved ${missing}.`);
  await db.$disconnect();
}

void main();
