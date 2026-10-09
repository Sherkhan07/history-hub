"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useDict } from "@/i18n/provider";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useDict();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">{t.common.error}</h1>
      <p className="max-w-md text-muted-foreground">
        {t.common.errorText}
        {error.digest ? ` (${error.digest})` : ""}
      </p>
      <Button onClick={reset} size="lg">{t.common.retry}</Button>
    </main>
  );
}
