import { Icon, type IconName } from "./icon";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, icon, hint, tone = "steppe" }: { label: string; value: React.ReactNode; icon: IconName; hint?: string; tone?: "steppe" | "gold" | "sage" | "clay" }) {
  const tones = {
    steppe: "bg-steppe-soft text-steppe",
    gold: "bg-gold-soft text-[oklch(0.5_0.1_70)]",
    sage: "bg-sage-soft text-sage",
    clay: "bg-clay-soft text-clay",
  };
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={cn("grid size-9 place-items-center rounded-xl", tones[tone])}>
          <Icon name={icon} className="size-4.5" />
        </span>
      </div>
      <p className="mt-3 font-heading text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
