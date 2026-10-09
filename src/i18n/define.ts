/** Declares a message namespace; `kk` must have exactly the shape of `ru` (checked by TypeScript). */
export function defineMessages<T>(m: { ru: T; kk: NoInfer<T> }): { ru: T; kk: T } {
  return m;
}

/** Plural forms for numerals: Russian needs three; Kazakh repeats one word three times. */
export const p = (one: string, few: string, many: string) => [one, few, many] as const;
export type PluralForms = readonly [string, string, string];
