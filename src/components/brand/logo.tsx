import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-9 shrink-0", className)} aria-hidden="true">
      <rect width="64" height="64" rx="16" className="fill-steppe" />
      <path d="M32 44 C32 32 24 26 18 27.5 C12 29 11.5 37 16.5 39 C20 40.4 23.5 37.5 21.5 34" stroke="#f3cf73" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path d="M32 44 C32 32 40 26 46 27.5 C52 29 52.5 37 47.5 39 C44 40.4 40.5 37.5 42.5 34" stroke="#f3cf73" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path d="M32 44 V52" stroke="#f3cf73" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="32" cy="15" r="4" fill="#f3cf73" />
    </svg>
  );
}

export function Logo({ href = "/", className, inverted }: { href?: string; className?: string; inverted?: boolean }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 rounded-lg", className)} aria-label="History Hub">
      <LogoMark />
      <span className={cn("font-heading text-lg font-semibold tracking-tight whitespace-nowrap", inverted ? "text-white" : "text-ink")}>
        History<span className={inverted ? "text-gold" : "text-steppe"}> Hub</span>
      </span>
    </Link>
  );
}
