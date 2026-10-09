"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, RotateCw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CardsContent } from "../content";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";

/** Flash cards: one-at-a-time for the board (flip with Space/click), or grid overview. */
export function CardsView({ cards }: { cards: CardsContent["cards"] }) {
  const t = useDict();
  const [mode, setMode] = useState<"single" | "grid">("single");
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [flippedSet, setFlippedSet] = useState<Set<number>>(new Set());

  const go = useCallback((n: number) => {
    setI(Math.min(Math.max(n, 0), cards.length - 1));
    setFlipped(false);
  }, [cards.length]);

  useEffect(() => {
    if (mode !== "single") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, i, go]);

  if (!cards.length) return null;
  const card = cards[i];

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant={mode === "single" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("single")}><Square /> {t.viewer.oneByOne}</Button>
        <Button variant={mode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("grid")}><LayoutGrid /> {t.viewer.allCards}</Button>
      </div>
      {mode === "single" ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className={cn(
              "relative flex min-h-[320px] w-full flex-col items-center justify-center rounded-3xl border p-10 text-center shadow-lift transition-colors",
              flipped ? "bg-steppe text-white" : "bg-card",
            )}
            aria-label={flipped ? t.viewer.showTerm : t.viewer.showDefinition}
          >
            <span className={cn("absolute top-5 left-6 text-sm", flipped ? "text-white/70" : "text-muted-foreground")}>
              {i + 1} / {cards.length}
            </span>
            <RotateCw className={cn("absolute top-5 right-6 size-5", flipped ? "text-white/70" : "text-muted-foreground")} aria-hidden />
            <p className={cn("font-heading font-semibold text-balance", flipped ? "text-2xl leading-relaxed font-normal sm:text-3xl" : "text-4xl sm:text-5xl")}>
              {flipped ? card.back : card.front}
            </p>
          </button>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="lg" onClick={() => go(i - 1)} disabled={i === 0}><ChevronLeft /> {t.common.back}</Button>
            <Button size="lg" onClick={() => go(i + 1)} disabled={i === cards.length - 1}>{t.common.next} <ChevronRight /></Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, idx) => {
            const f = flippedSet.has(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setFlippedSet((s) => { const n = new Set(s); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; })}
                className={cn("min-h-36 rounded-2xl border p-5 text-left shadow-soft transition-colors", f ? "bg-steppe-soft" : "bg-card")}
              >
                <p className="font-heading text-lg font-medium">{c.front}</p>
                {f && <p className="mt-2 text-sm text-foreground/80">{c.back}</p>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
