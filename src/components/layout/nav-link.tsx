"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon, type IconName } from "@/components/common/icon";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon?: IconName; badge?: number; exact?: boolean };

function isActive(pathname: string, search: URLSearchParams, item: NavItem) {
  const [path, query] = item.href.split("?");
  if (query) {
    const want = new URLSearchParams(query);
    return pathname === path && [...want].every(([k, v]) => search.get(k) === v);
  }
  if (item.exact || path === "/admin" || path === "/moderator" || path === "/teacher") return pathname === path && ![...search].length;
  return pathname === path || pathname.startsWith(path + "/");
}

export function SidebarNav({ groups }: { groups: { label?: string; items: NavItem[] }[] }) {
  const pathname = usePathname();
  const search = useSearchParams();
  return (
    <nav className="space-y-6" aria-label="Navigation">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.label && <p className="mb-2 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = isActive(pathname, search, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                      active ? "bg-card font-medium text-foreground shadow-soft" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )}
                  >
                    {item.icon && <Icon name={item.icon} className={cn("size-4.5", active && "text-steppe")} />}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? <span className="rounded-full bg-steppe px-2 text-xs leading-5 font-medium text-white">{item.badge}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function TopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const search = useSearchParams();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation">
      {items.map((item) => {
        const active = isActive(pathname, search, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn("flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm whitespace-nowrap transition-colors", active ? "bg-card font-medium shadow-soft" : "text-muted-foreground hover:text-foreground")}
          >
            {item.icon && <Icon name={item.icon} className="size-4" />}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
