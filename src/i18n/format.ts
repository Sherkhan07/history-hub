import type { Locale } from "@/lib/constants";

/** Interpolates "{name}" placeholders: fmt("Урок №{n}", { n: 7 }) */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

/** BCP-47 tag for Intl APIs */
export function intlLocale(locale: Locale): string {
  return locale === "kk" ? "kk-KZ" : "ru-RU";
}
