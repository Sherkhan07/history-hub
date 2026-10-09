import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Icon, RESOURCE_ICONS, type IconName } from "@/components/common/icon";
import { cn } from "@/lib/utils";

export type MaterialTile = {
  key: string;
  href: string;
  title: string;
  label: string;
  meta: string;
  icon: IconName;
  tone: "steppe" | "gold" | "sage" | "clay" | "ink";
};

const TONES = {
  steppe: "bg-steppe-soft text-steppe",
  gold: "bg-gold-soft text-[oklch(0.5_0.1_70)]",
  sage: "bg-sage-soft text-sage",
  clay: "bg-clay-soft text-clay",
  ink: "bg-muted text-foreground",
};

export function ResourceCard({ tile }: { tile: MaterialTile }) {
  return (
    <Link
      href={tile.href}
      className="group relative flex flex-col justify-between gap-6 rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-steppe/30 hover:shadow-lift"
    >
      <div className="flex items-start justify-between">
        <span className={cn("grid size-12 place-items-center rounded-2xl", TONES[tile.tone])}>
          <Icon name={tile.icon} className="size-6" />
        </span>
        <ArrowUpRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{tile.label}</p>
        <p className="mt-0.5 font-heading text-xl font-semibold">{tile.meta}</p>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground" title={tile.title}>{tile.title}</p>
      </div>
    </Link>
  );
}

export function MaterialsGrid({ tiles }: { tiles: MaterialTile[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <ResourceCard key={t.key} tile={t} />
      ))}
    </div>
  );
}

export { RESOURCE_ICONS };
