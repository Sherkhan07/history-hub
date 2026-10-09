import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/logo";
import { JoinForm } from "@/features/sessions/components/join-form";
import { getDictionary } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).session.joinMeta };
}

export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  const { pin } = await searchParams;
  const t = await getDictionary();
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-steppe px-4 py-16">
      <div className="pointer-events-none absolute inset-0 ornament-bg opacity-30 invert" aria-hidden />
      <div className="relative w-full max-w-sm rounded-3xl bg-card p-7 shadow-lift">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <LogoMark className="size-12" />
          <h1 className="text-2xl font-semibold">{t.session.joinTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.session.joinSubtitle}</p>
        </div>
        <JoinForm initialPin={typeof pin === "string" && /^\d{6}$/.test(pin) ? pin : undefined} />
      </div>
    </main>
  );
}
