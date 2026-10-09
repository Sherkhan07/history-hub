"use client";

import type { ContentStatus, Role } from "@/generated/prisma/enums";
import { useDict } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const STATUS_STYLE: Record<ContentStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  IN_REVIEW: "bg-gold-soft text-[oklch(0.5_0.1_70)]",
  APPROVED: "bg-steppe-soft text-steppe",
  PUBLISHED: "bg-sage-soft text-sage",
  REJECTED: "bg-clay-soft text-clay",
  ARCHIVED: "bg-muted text-muted-foreground line-through",
};

export function ModerationStatusBadge({ status, label, className }: { status: ContentStatus; label?: string; className?: string }) {
  const t = useDict();
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap", STATUS_STYLE[status], className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {label ?? t.status[status]}
    </span>
  );
}

const ROLE_STYLE: Record<Role, string> = {
  ADMIN: "bg-ink text-white",
  MODERATOR: "bg-steppe-soft text-steppe",
  TEACHER: "bg-gold-soft text-[oklch(0.45_0.09_70)]",
};

export function RoleBadge({ role, label }: { role: Role; label?: string }) {
  const t = useDict();
  return <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium", ROLE_STYLE[role])}>{label ?? t.roles[role]}</span>;
}

export function UserAvatar({ name, className }: { name: string; className?: string }) {
  const hue = [...name].reduce((h, c) => (h + c.charCodeAt(0)) % 360, 0);
  return (
    <span
      className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white", className)}
      style={{ background: `oklch(0.55 0.09 ${hue})` }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
