"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDict } from "@/i18n/provider";

export function PrintButton() {
  const t = useDict();
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer /> <span className="hidden sm:inline">{t.common.print}</span>
    </Button>
  );
}
