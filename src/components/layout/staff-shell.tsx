import { Suspense } from "react";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav, type NavItem } from "./nav-link";
import { UserMenu, type MenuUser } from "./user-menu";
import { getDictionary } from "@/i18n";

export async function StaffShell({
  user,
  home,
  groups,
  title,
  children,
}: {
  user: MenuUser;
  home: string;
  title: string;
  groups: { label?: string; items: NavItem[] }[];
  children: React.ReactNode;
}) {
  const t = await getDictionary();
  const nav = (
    <Suspense>
      <SidebarNav groups={groups} />
    </Suspense>
  );
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-sidebar px-4 py-6 lg:flex">
        <Logo href={home} className="mb-1 px-2" />
        <p className="mb-8 px-2 text-xs text-muted-foreground">{title}</p>
        <div className="flex-1 overflow-y-auto scrollbar-none">{nav}</div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/85 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <Sheet>
              <SheetTrigger className="grid size-10 place-items-center rounded-xl hover:bg-muted" aria-label={t.common.menu}>
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar p-4">
                <SheetTitle className="sr-only">{t.common.navigation}</SheetTitle>
                <Logo href={home} className="mb-6 px-2" />
                {nav}
              </SheetContent>
            </Sheet>
            <span className="font-heading font-medium">{title}</span>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <UserMenu user={user} />
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
