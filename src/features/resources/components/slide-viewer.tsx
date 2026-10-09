"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";

export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isFull, setFull] = useState(false);
  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggle = useCallback(() => {
    if (!ref.current) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void ref.current.requestFullscreen?.();
  }, []);
  return { ref, isFull, toggle };
}

/**
 * Image-based slide viewer: keyboard (← → Home End F), click zones, thumbnails, fullscreen.
 * `range` limits navigation to part of the deck (used by lesson stages).
 */
export function SlideViewer({
  pages,
  title,
  range,
  initial = 0,
  showThumbnails = true,
  captureKeys = true,
  className,
  onIndexChange,
  index: controlledIndex,
  fill,
}: {
  pages: string[];
  title: string;
  range?: [number, number];
  initial?: number;
  showThumbnails?: boolean;
  captureKeys?: boolean;
  className?: string;
  onIndexChange?: (index: number) => void;
  /** Controlled mode: parent owns the current slide index (0-based, absolute) */
  index?: number;
  /** Stretch to the parent's height (presentation mode) */
  fill?: boolean;
}) {
  const t = useDict();
  const from = range ? Math.max(0, range[0] - 1) : 0;
  const to = range ? Math.min(pages.length - 1, range[1] - 1) : pages.length - 1;
  const [innerIndex, setIndex] = useState(Math.min(Math.max(initial, from), to));
  const index = controlledIndex ?? innerIndex;
  const { ref, isFull, toggle } = useFullscreen<HTMLDivElement>();
  const thumbs = useRef<HTMLDivElement>(null);

  // Reset to the first slide of a new range (React "adjust state on prop change" pattern)
  const [prevRange, setPrevRange] = useState(`${from}-${to}`);
  if (prevRange !== `${from}-${to}`) {
    setPrevRange(`${from}-${to}`);
    setIndex(from);
  }

  const go = useCallback(
    (i: number) => {
      const next = Math.min(Math.max(i, from), to);
      setIndex(next);
      onIndexChange?.(next);
    },
    [from, to, onIndexChange],
  );

  useEffect(() => {
    if (!captureKeys) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Home") go(from);
      else if (e.key === "End") go(to);
      else if (e.key.toLowerCase() === "f") toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [captureKeys, go, index, from, to, toggle]);

  useEffect(() => {
    thumbs.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  if (!pages.length) return null;
  const visible = pages.slice(from, to + 1);

  return (
    <div className={cn("flex flex-col gap-3", fill && "h-full min-h-0", className)}>
      <div
        ref={ref}
        className={cn("group relative overflow-hidden rounded-2xl bg-ink", (isFull || fill) && "flex min-h-0 flex-1 items-center justify-center", isFull && "rounded-none")}
        aria-roledescription="carousel"
        aria-label={title}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- auth-protected, pre-optimized WebP */}
        <img
          key={pages[index]}
          src={pages[index]}
          alt={fmt(t.viewer.slideAlt, { title, n: index + 1 })}
          className={cn("mx-auto block aspect-video w-full object-contain", isFull && "h-screen w-auto max-w-full", fill && !isFull && "h-full w-auto max-w-full")}
          draggable={false}
        />
        {/* preload neighbours */}
        {[index - 1, index + 1].filter((i) => i >= from && i <= to).map((i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`pre-${i}`} src={pages[i]} alt="" className="hidden" aria-hidden />
        ))}
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index <= from}
          className="absolute inset-y-0 left-0 flex w-1/5 items-center justify-start pl-4 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:hidden"
          aria-label={t.viewer.prevSlide}
        >
          <span className="grid size-12 place-items-center rounded-full bg-black/40 backdrop-blur-sm"><ChevronLeft className="size-6" /></span>
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index >= to}
          className="absolute inset-y-0 right-0 flex w-1/5 items-center justify-end pr-4 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:hidden"
          aria-label={t.viewer.nextSlide}
        >
          <span className="grid size-12 place-items-center rounded-full bg-black/40 backdrop-blur-sm"><ChevronRight className="size-6" /></span>
        </button>
        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white tabular-nums backdrop-blur-sm" aria-live="polite">
            {index + 1} / {pages.length}
          </span>
          <button type="button" onClick={toggle} className="grid size-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70" aria-label={isFull ? t.viewer.exitFullscreen : t.viewer.fullscreen}>
            {isFull ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        </div>
      </div>
      {showThumbnails && visible.length > 1 && (
        <div ref={thumbs} className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label={t.viewer.slidesList}>
          {visible.map((src, i) => {
            const real = from + i;
            return (
              <button
                key={src}
                type="button"
                role="tab"
                data-index={real}
                aria-selected={real === index}
                aria-label={fmt(t.viewer.slideN, { n: real + 1 })}
                onClick={() => go(real)}
                className={cn("relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg ring-2 ring-transparent transition", real === index ? "ring-steppe" : "opacity-60 hover:opacity-100")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" className="size-full object-cover" />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">{real + 1}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
