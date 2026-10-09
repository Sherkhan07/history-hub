"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/common/submit-button";
import { useDict } from "@/i18n/provider";
import { forgotPasswordAction, resetPasswordAction } from "../actions";

function Notice({ kind, text }: { kind: "error" | "success"; text: string }) {
  const Icon = kind === "error" ? AlertCircle : CheckCircle2;
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`flex gap-2 rounded-lg px-3 py-2.5 text-sm ${kind === "error" ? "bg-destructive/10 text-destructive" : "bg-sage-soft text-sage"}`}>
      <Icon className="mt-0.5 size-4 shrink-0" /> {text}
    </p>
  );
}

export function ForgotForm() {
  const t = useDict();
  const [state, action] = useActionState(forgotPasswordAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input id="email" name="email" type="email" required autoFocus className="h-12 text-base" />
      </div>
      {state?.error && <Notice kind="error" text={state.error} />}
      {state?.success && <Notice kind="success" text={state.success} />}
      <SubmitButton size="lg" className="w-full">{t.auth.forgotSubmit}</SubmitButton>
      <Link href="/login" className="block text-center text-sm text-steppe hover:underline">{t.auth.backToLogin}</Link>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const t = useDict();
  const [state, action] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="password">{t.auth.newPassword}</Label>
        <Input id="password" name="password" type="password" minLength={8} required autoFocus autoComplete="new-password" className="h-12 text-base" />
      </div>
      {state?.error && <Notice kind="error" text={state.error} />}
      {state?.success && <Notice kind="success" text={state.success} />}
      <SubmitButton size="lg" className="w-full">{t.auth.resetSubmit}</SubmitButton>
      <Link href="/login" className="block text-center text-sm text-steppe hover:underline">{t.auth.backToLogin}</Link>
    </form>
  );
}
