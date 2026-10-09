"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { clientIp, createSession, destroySession, getCurrentUser, newToken, sha256 } from "@/server/auth/session";
import { homePathFor } from "@/server/auth/permissions";
import { rateLimit, resetRateLimit } from "@/server/rate-limit";
import { audit } from "@/server/audit";
import { getDictionary } from "@/i18n";
import { translateMsg } from "@/i18n/msg";

export type FormState = { error?: string; success?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("emailInvalid"),
  password: z.string().min(1, "passwordRequired").max(200),
  next: z.string().optional(),
});

// Constant-time-ish dummy hash to avoid user enumeration through response timing
const DUMMY_HASH = "$2b$12$KixjQeNY8twd1ypulBb14.Vqzthx92o33f4HEE2NxtIw8k6dFw5au";

function safeNext(next: string | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) return fallback;
  return next;
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const t = await getDictionary();
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: translateMsg(t, parsed.error.issues[0]?.message ?? "formInvalid") };
  const { email, password, next } = parsed.data;

  const ip = await clientIp();
  const limitKey = `login:${ip}:${email}`;
  if (!rateLimit(limitKey, 8, 60_000).ok || !rateLimit(`login-ip:${ip}`, 30, 60_000).ok) {
    return { error: t.msg.tooMany };
  }

  const user = await db.user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    await audit({ actorId: user?.id ?? null, action: "auth.login_failed", entityType: "User", entityId: user?.id, metadata: { email } });
    return { error: t.msg.badCredentials };
  }
  if (user.isBlocked) return { error: t.msg.accountBlocked };

  resetRateLimit(limitKey);
  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ actorId: user.id, action: "auth.login", entityType: "User", entityId: user.id });
  redirect(safeNext(next, homePathFor(user.role)));
}

export async function logoutAction() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit({ actorId: user.id, action: "auth.logout", entityType: "User", entityId: user.id });
  redirect("/login");
}

export async function forgotPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const t = await getDictionary();
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { error: t.msg.emailInvalid };
  const ip = await clientIp();
  if (!rateLimit(`forgot:${ip}`, 5, 15 * 60_000).ok) return { error: t.msg.tooManyLater };

  const user = await db.user.findUnique({ where: { email: email.data } });
  if (user && !user.isBlocked) {
    const token = newToken();
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
    });
    const link = `${env.APP_URL}/reset-password/${token}`;
    // No mail transport is configured in the MVP: the request is visible to admins in the audit log,
    // and in development the link is printed to the server console.
    if (env.NODE_ENV !== "production") console.info(`[password reset] ${user.email}: ${link}`);
    await audit({ actorId: user.id, action: "auth.reset_requested", entityType: "User", entityId: user.id, metadata: { email: user.email } });
  }
  return { success: t.msg.resetRequested };
}

const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8, "passwordMin").max(200),
});

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const t = await getDictionary();
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: translateMsg(t, parsed.error.issues[0]?.message ?? "formInvalid") };
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(parsed.data.token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return { error: t.msg.resetInvalid };
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(parsed.data.password) } }),
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: row.userId } }),
  ]);
  await audit({ actorId: row.userId, action: "auth.password_reset", entityType: "User", entityId: row.userId });
  return { success: t.msg.passwordUpdated };
}

