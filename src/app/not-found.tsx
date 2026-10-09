import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { getDictionary } from "@/i18n";

export default async function NotFound() {
  const t = await getDictionary();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <LogoMark className="size-14" />
      <p className="font-heading text-7xl font-bold text-steppe/30">404</p>
      <h1 className="text-2xl font-semibold">{t.common.notFound}</h1>
      <p className="max-w-sm text-muted-foreground">{t.common.notFoundText}</p>
      <Link href="/" className="inline-flex h-11 items-center rounded-xl bg-steppe px-5 font-medium text-white">{t.common.toHome}</Link>
    </main>
  );
}
