"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, MapPin, X } from "lucide-react";
import { KZ_CITIES, KZ_WATER, MAP_HEIGHT, MAP_WIDTH, outlinePath, project, unproject } from "../kz-map";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";

export const OPTION_TONES = [
  "bg-steppe text-white hover:bg-steppe/90",
  "bg-clay text-white hover:bg-clay/90",
  "bg-sage text-white hover:bg-sage/90",
  "bg-[oklch(0.66_0.12_75)] text-white hover:bg-[oklch(0.62_0.12_75)]",
  "bg-ink text-white hover:bg-ink/90",
  "bg-[oklch(0.55_0.1_300)] text-white hover:bg-[oklch(0.5_0.1_300)]",
];
export const OPTION_LETTERS = ["А", "Б", "В", "Г", "Д", "Е"];

export type OptionState = "idle" | "selected" | "correct" | "wrong" | "dim";

/** Big colourful answer buttons (whiteboard-friendly). */
export function OptionGrid({
  options,
  states,
  onPick,
  disabled,
  columns = 2,
}: {
  options: string[];
  states?: OptionState[];
  onPick?: (index: number) => void;
  disabled?: boolean;
  columns?: 1 | 2;
}) {
  const t = useDict();
  return (
    <div className={cn("grid gap-3", columns === 2 && "sm:grid-cols-2")} role="group">
      {options.map((o, i) => {
        const st = states?.[i] ?? "idle";
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onPick?.(i)}
            aria-pressed={st === "selected"}
            className={cn(
              "relative flex min-h-16 items-center gap-4 rounded-2xl px-5 py-4 text-left text-lg font-medium shadow-soft transition-all disabled:cursor-default",
              OPTION_TONES[i % OPTION_TONES.length],
              st === "selected" && "ring-4 ring-gold ring-offset-2 ring-offset-background",
              st === "correct" && "ring-4 ring-success ring-offset-2 ring-offset-background",
              (st === "wrong" || st === "dim") && "opacity-40",
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/20 font-heading text-base">{OPTION_LETTERS[i]}</span>
            <span className="flex-1">{o}</span>
            {st === "correct" && <Check className="size-6 shrink-0" aria-label={t.play.correctMark} />}
            {st === "wrong" && <X className="size-6 shrink-0" aria-label={t.play.wrongMark} />}
          </button>
        );
      })}
    </div>
  );
}

/** Reorderable list with large up/down controls (works with touch, keyboard and pointer). */
export function OrderList({
  items,
  order,
  onChange,
  disabled,
  marks,
}: {
  items: { id: string; text: string }[];
  order: string[];
  onChange: (order: string[]) => void;
  disabled?: boolean;
  marks?: Record<string, boolean>;
}) {
  const t = useDict();
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  return (
    <ol className="space-y-2.5">
      {order.map((id, i) => {
        const mark = marks?.[id];
        return (
          <li
            key={id}
            className={cn(
              "flex items-center gap-3 rounded-2xl border bg-card p-3 pl-4 shadow-soft transition-colors",
              mark === true && "border-success bg-sage-soft",
              mark === false && "border-destructive/50 bg-clay-soft",
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-steppe-soft font-heading font-semibold text-steppe tabular-nums">{i + 1}</span>
            <span className="flex-1 text-base sm:text-lg">{byId.get(id)?.text}</span>
            {!disabled && (
              <span className="flex gap-1">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="grid size-11 place-items-center rounded-xl border hover:bg-muted disabled:opacity-30" aria-label={t.common.up}>
                  <ArrowUp className="size-5" />
                </button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === order.length - 1} className="grid size-11 place-items-center rounded-xl border hover:bg-muted disabled:opacity-30" aria-label={t.common.down}>
                  <ArrowDown className="size-5" />
                </button>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const PAIR_COLORS = ["bg-steppe", "bg-clay", "bg-sage", "bg-[oklch(0.66_0.12_75)]", "bg-ink", "bg-[oklch(0.55_0.1_300)]", "bg-[oklch(0.6_0.1_200)]", "bg-[oklch(0.5_0.08_20)]"];

/**
 * Tap-to-pair matching board. `value` maps leftId → rightKey.
 * Right items are identified by `key` (id for games, text for quiz matching).
 */
export function MatchBoard({
  left,
  right,
  value,
  onChange,
  disabled,
  marks,
}: {
  left: { id: string; text: string }[];
  right: { key: string; text: string }[];
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  disabled?: boolean;
  marks?: Record<string, boolean>;
}) {
  const t = useDict();
  const [active, setActive] = useState<string | null>(null);
  const colorOf = (leftId: string) => PAIR_COLORS[left.findIndex((l) => l.id === leftId) % PAIR_COLORS.length];
  // A right value may legitimately be used by several left items (category sorting)
  const usedBy = (key: string) => Object.entries(value).filter(([, v]) => v === key).map(([k]) => k);
  const allowReuse = new Set(right.map((r) => r.key)).size < left.length;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ul className="space-y-2.5" aria-label={t.play.left}>
        {left.map((l, i) => {
          const paired = value[l.id];
          const mark = marks?.[l.id];
          return (
            <li key={l.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setActive(active === l.id ? null : l.id)}
                aria-pressed={active === l.id}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left text-base shadow-soft transition-all sm:text-lg",
                  active === l.id && "border-gold ring-4 ring-gold/40",
                  mark === true && "border-success bg-sage-soft",
                  mark === false && "border-destructive/50 bg-clay-soft",
                )}
              >
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-sm font-semibold text-white", paired ? colorOf(l.id) : "bg-muted text-muted-foreground")}>{i + 1}</span>
                <span className="flex-1">{l.text}</span>
                {paired && <span className="max-w-[40%] truncate rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">{right.find((r) => r.key === paired)?.text}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="space-y-2.5" aria-label={t.play.right}>
        {right.map((r) => {
          const owners = usedBy(r.key);
          return (
            <li key={r.key}>
              <button
                type="button"
                disabled={disabled || !active}
                onClick={() => {
                  if (!active) return;
                  const next = { ...value };
                  if (!allowReuse) for (const o of owners) delete next[o];
                  next[active] = r.key;
                  onChange(next);
                  setActive(null);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border border-dashed bg-card/60 p-4 text-left text-base transition-all sm:text-lg",
                  active && !disabled && "border-solid border-steppe/50 bg-card hover:bg-steppe-soft",
                )}
              >
                <span className="flex gap-1">
                  {owners.length ? owners.map((o) => <span key={o} className={cn("size-3 rounded-full", colorOf(o))} />) : <span className="size-3 rounded-full bg-muted" />}
                </span>
                <span className="flex-1">{r.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {!disabled && <p className="text-sm text-muted-foreground md:col-span-2">{t.play.matchHint}</p>}
    </div>
  );
}

/** Clickable outline map of Kazakhstan. */
export function KzMap({
  value,
  onChange,
  target,
  disabled,
  className,
}: {
  value?: { lat: number; lon: number } | null;
  onChange?: (v: { lat: number; lon: number }) => void;
  target?: { lat: number; lon: number; radiusKm: number; label: string } | null;
  disabled?: boolean;
  className?: string;
}) {
  const t = useDict();
  const path = useMemo(() => outlinePath(), []);
  const pick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled || !onChange) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    onChange(unproject(p.x, p.y));
  };
  const marker = value ? project(value.lon, value.lat) : null;
  const tgt = target ? project(target.lon, target.lat) : null;
  // ~ km → px (horizontal scale at 48°N)
  const kmPx = MAP_WIDTH / ((88 - 46) * 111 * Math.cos((48 * Math.PI) / 180));

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      onClick={pick}
      className={cn("w-full rounded-2xl bg-[oklch(0.95_0.03_230)] select-none", !disabled && onChange && "cursor-crosshair", className)}
      role="img"
      aria-label={t.play.map}
    >
      <path d={path} className="fill-[oklch(0.93_0.05_95)] stroke-[oklch(0.6_0.06_70)]" strokeWidth={2.5} strokeLinejoin="round" />
      {KZ_WATER.map((w) => {
        const p = project(w.lon, w.lat);
        return <text key={w.name} x={p.x} y={p.y} textAnchor="middle" className="fill-[oklch(0.55_0.08_230)] text-[15px] italic">{w.name}</text>;
      })}
      {KZ_CITIES.map((c) => {
        const p = project(c.lon, c.lat);
        return (
          <g key={c.name} className="pointer-events-none">
            <circle cx={p.x} cy={p.y} r={4} className="fill-ink/50" />
            <text x={p.x + 7} y={p.y + 4} className="fill-ink/55 text-[14px]">{c.name}</text>
          </g>
        );
      })}
      {tgt && target && (
        <g>
          <circle cx={tgt.x} cy={tgt.y} r={target.radiusKm * kmPx} className="fill-success/20 stroke-success" strokeWidth={2} strokeDasharray="6 5" />
          <circle cx={tgt.x} cy={tgt.y} r={7} className="fill-success" />
          <text x={tgt.x} y={tgt.y - 14} textAnchor="middle" className="fill-ink text-[17px] font-semibold">{target.label}</text>
        </g>
      )}
      {marker && (
        <g transform={`translate(${marker.x} ${marker.y})`}>
          <MapPin x={-16} y={-32} width={32} height={32} className="fill-clay stroke-white" strokeWidth={1.5} />
        </g>
      )}
    </svg>
  );
}
