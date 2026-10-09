import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotForm } from "@/features/auth/components/forgot-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).auth.forgotMeta };
}

export default async function ForgotPasswordPage() {
  const t = await getDictionary();
  return (
    <AuthShell title={t.auth.forgotTitle} subtitle={t.auth.forgotSubtitle}>
      <ForgotForm />
    </AuthShell>
  );
}
