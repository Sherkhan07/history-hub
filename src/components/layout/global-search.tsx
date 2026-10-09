"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useDict } from "@/i18n/provider";
import { cn } from "@/lib/utils";

/** Teacher global search. "/" focuses it from anywhere. */
export function GlobalSearch({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  const t = useDict();
  const router = useRouter();
  const params = useSearchParams();
  // `q` is the search query only on the search page (catalog pages use it for the quarter)
  const onSearchPage = usePathname() === "/teacher/search";
  const [q, setQ] = useState(onSearchPage ? (params.get("q") ?? "") : "");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(target.tagName) && !target.isContentEditable) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/teacher/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <Search className={cn("pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground", size === "lg" ? "size-5" : "size-4")} aria-hidden />
      <input
        ref={ref}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.teacher.searchPlaceholder}
        aria-label={t.common.search}
        className={cn(
          "w-full rounded-xl border bg-card pr-10 text-foreground shadow-soft outline-none placeholder:text-muted-foreground/80 focus:border-ring focus:ring-3 focus:ring-ring/30",
          size === "lg" ? "h-14 pl-11 text-base" : "h-10 pl-10 text-sm",
        )}
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border bg-muted px-1.5 text-[11px] text-muted-foreground sm:block">/</kbd>
    </form>
  );
}
