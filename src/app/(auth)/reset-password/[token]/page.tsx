import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetForm } from "@/features/auth/components/forgot-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).auth.resetMeta };
}

export default async function ResetPasswordPage({ params }: PageProps<"/reset-password/[token]">) {
  const t = await getDictionary();
  const { token } = await params;
  return (
    <AuthShell title={t.auth.resetTitle}>
      <ResetForm token={token} />
    </AuthShell>
  );
}
