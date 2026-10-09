import type { Locale } from "@/lib/constants";

/** Subject title in the UI language (Kazakh name falls back to Russian). */
export function subjectName(s: { name: string; nameKk?: string | null }, locale: Locale): string {
  return locale === "kk" && s.nameKk ? s.nameKk : s.name;
}
