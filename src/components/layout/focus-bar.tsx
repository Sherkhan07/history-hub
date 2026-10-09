import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function FocusBar({ backHref, backLabel, title, subtitle, actions }: { backHref: string; backLabel: string; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-8">
        <Link href={backHref} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium hover:bg-muted">
          <ArrowLeft className="size-4" /> {backLabel}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading font-medium">{title}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}
