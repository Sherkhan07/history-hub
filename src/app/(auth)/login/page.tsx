import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { homePathFor } from "@/server/auth/permissions";
import { getDictionary } from "@/i18n";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).auth.loginMeta };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));
  const t = await getDictionary();
  const { next } = await searchParams;
  return (
    <AuthShell title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle}>
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </AuthShell>
  );
}
