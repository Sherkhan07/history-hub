"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "./dictionaries/ru";
import type { Locale } from "@/lib/constants";
import { intlLocale } from "./format";

const I18nContext = createContext<{ dict: Dictionary; locale: Locale } | null>(null);

export function I18nProvider({ dict, locale, children }: { dict: Dictionary; locale: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={{ dict, locale }}>{children}</I18nContext.Provider>;
}

export function useDict(): Dictionary {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useDict must be used inside I18nProvider");
  return ctx.dict;
}

export function useLocale(): Locale {
  return useContext(I18nContext)?.locale ?? "kk";
}

/** BCP-47 tag for Intl formatting in client components */
export function useIntlLocale(): string {
  return intlLocale(useLocale());
}
