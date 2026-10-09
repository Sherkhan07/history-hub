import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/constants";
import { DEFAULT_MAX_UPLOAD_MB } from "@/features/resources/file-rules";

export const settingsSchema = z.object({
  "uploads.maxSizeMb": z.coerce.number().int().min(1).max(500).default(DEFAULT_MAX_UPLOAD_MB),
  "platform.academicYear": z.string().regex(/^\d{4}\/\d{4}$/, "yearFormat").default(DEFAULT_ACADEMIC_YEAR),
  "platform.announcement": z.string().max(500).default(""),
  "sessions.defaultTimePerQuestion": z.coerce.number().int().min(5).max(300).default(30),
});

export type Settings = z.infer<typeof settingsSchema>;

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const raw = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const parsed = settingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : settingsSchema.parse({});
}
