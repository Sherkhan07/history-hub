"use client";

import Link from "next/link";
import { useTransition } from "react";
import { LayoutDashboard, LogOut, PenSquare, School } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/common/badges";
import { useDict } from "@/i18n/provider";
import { logoutAction } from "@/features/auth/actions";

export type MenuUser = { name: string; email: string; role: "ADMIN" | "MODERATOR" | "TEACHER" };

export function UserMenu({ user }: { user: MenuUser }) {
  const t = useDict();
  const [, start] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label={user.name}>
        <UserAvatar name={user.name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-steppe">{t.roles[user.role]}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === "ADMIN" && (
          <DropdownMenuItem asChild>
            <Link href="/admin"><LayoutDashboard /> {t.nav.adminView}</Link>
          </DropdownMenuItem>
        )}
        {(user.role === "ADMIN" || user.role === "MODERATOR") && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/moderator"><PenSquare /> {t.nav.moderatorView}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/teacher"><School /> {t.nav.teacherView}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={() => start(() => logoutAction())} variant="destructive">
          <LogOut /> {t.common.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
