import "server-only";
import type { Locale } from "@/lib/constants";
import { ru, type Dictionary } from "./dictionaries/ru";
import { kk } from "./dictionaries/kk";

const dictionaries: Record<Locale, Dictionary> = { ru, kk };

/** The interface is Kazakh-only. The Russian dictionary is kept so a second language can be re-enabled here. */
export const UI_LOCALE: Locale = "kk";

export async function getLocale(): Promise<Locale> {
  return UI_LOCALE;
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}

/** Dictionary + locale in one call (pages that also format dates). */
export async function getI18n(): Promise<{ t: Dictionary; locale: Locale }> {
  const locale = await getLocale();
  return { t: dictionaries[locale], locale };
}

export function dictionaryFor(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
