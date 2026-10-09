"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/common/submit-button";
import { useDict } from "@/i18n/provider";
import { loginAction } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const t = useDict();
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-2">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus className="h-12 text-base" placeholder="name@school.kz" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t.auth.password}</Label>
          <Link href="/forgot-password" className="text-sm text-steppe hover:underline">
            {t.auth.forgot}
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-12 text-base" />
      </div>
      {state?.error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </p>
      )}
      <SubmitButton size="lg" className="w-full" pendingText={t.common.loading}>
        {t.auth.login}
      </SubmitButton>
    </form>
  );
}
