"use client";

import { Logo } from "@/components/brand/logo";
import { useDict } from "@/i18n/provider";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const t = useDict();
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-steppe text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="pointer-events-none absolute inset-0 ornament-bg opacity-[0.35] invert" aria-hidden />
        <div className="pointer-events-none absolute -right-40 -bottom-40 size-[520px] rounded-full bg-gold/25 blur-3xl" aria-hidden />
        <Logo inverted href="/login" />
        <div className="relative max-w-lg">
          <p className="mb-4 text-sm font-medium tracking-wide text-gold uppercase">{t.auth.heroKicker}</p>
          <h1 className="text-5xl leading-[1.05] font-semibold text-balance">{t.auth.heroTitle}</h1>
          <p className="mt-6 text-lg text-white/75">{t.auth.heroText}</p>
        </div>
        <ul className="relative grid grid-cols-3 gap-4 text-sm text-white/80">
          {t.auth.heroFeatures.map((f) => (
            <li key={f} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-sm">
              {f}
            </li>
          ))}
        </ul>
      </section>
      <section className="relative flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-10 lg:hidden">
            <Logo href="/login" />
          </div>
          <h2 className="text-3xl font-semibold">{title}</h2>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
