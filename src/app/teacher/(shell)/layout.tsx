import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { GlobalSearch } from "@/components/layout/global-search";
import { TopNav } from "@/components/layout/nav-link";
import { UserMenu } from "@/components/layout/user-menu";
import { requireUser } from "@/server/auth/guards";
import { getDictionary } from "@/i18n";

export default async function TeacherShellLayout({ children }: { children: React.ReactNode }) {
  const [user, t] = await Promise.all([requireUser(), getDictionary()]);
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2">
        {t.common.skipToContent}
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-4 sm:px-8">
          <Logo href="/teacher" />
          <Suspense>
            <TopNav
              items={[
                { href: "/teacher", label: t.nav.home, icon: "Home" },
                { href: "/teacher/favorites", label: t.nav.favorites, icon: "Star" },
                { href: "/teacher/recent", label: t.nav.recent, icon: "Clock" },
              ]}
            />
          </Suspense>
          <div className="ml-auto hidden w-full max-w-sm md:block">
            <Suspense>
              <GlobalSearch />
            </Suspense>
          </div>
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <UserMenu user={{ name: user.name, email: user.email, role: user.role }} />
          </div>
        </div>
        <div className="space-y-2 border-t px-4 py-2 md:hidden">
          <Suspense>
            <GlobalSearch />
          </Suspense>
          <nav className="flex gap-1 text-sm" aria-label={t.common.navigation}>
            <Link href="/teacher" className="rounded-lg px-3 py-1.5 hover:bg-muted">{t.nav.home}</Link>
            <Link href="/teacher/favorites" className="rounded-lg px-3 py-1.5 hover:bg-muted">{t.nav.favorites}</Link>
            <Link href="/teacher/recent" className="rounded-lg px-3 py-1.5 hover:bg-muted">{t.nav.recent}</Link>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
