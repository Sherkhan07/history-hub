import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getDictionary } from "@/i18n";
import { can } from "@/server/auth/permissions";
import { assertSameOrigin, json } from "@/server/http";
import { storage } from "@/server/storage";
import { matchesSignature } from "@/features/resources/file-rules";

const MAX = 10 * 1024 * 1024;

/** Image for game items (artifacts, portraits). Stored under public/ so anonymous players can see it. */
export async function POST(request: NextRequest) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const t = await getDictionary();
  const user = await getCurrentUser();
  if (!user || !can(user, "lessons.edit")) return json({ error: t.msg.forbidden }, 403);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ error: t.msg.fileMissing }, 400);
  if (file.size > MAX) return json({ error: t.msg.imageTooBig }, 413);
  const data = Buffer.from(await file.arrayBuffer());
  if (!matchesSignature("image", data.subarray(0, 16))) return json({ error: t.msg.imageFormat }, 400);
  const webp = await sharp(data).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  const key = `public/games/${randomUUID()}.webp`;
  await storage().put(key, webp, "image/webp");
  return json({ key });
}
