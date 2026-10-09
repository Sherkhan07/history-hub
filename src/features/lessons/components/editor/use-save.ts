"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Result = { ok: true; data?: unknown; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Runs a server action with toast feedback and refreshes server components on success. */
export function useSave() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = <R extends Result>(fn: () => Promise<R>, opts: { success?: string; onSuccess?: (r: Extract<R, { ok: true }>) => void } = {}) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        const msg = (r.data as { message?: string } | undefined)?.message ?? r.message ?? opts.success;
        if (msg) toast.success(msg);
        opts.onSuccess?.(r as Extract<R, { ok: true }>);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  return { pending, run };
}
