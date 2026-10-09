"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { authorize } from "@/server/auth/guards";
import { hashPassword } from "@/server/auth/password";
import { newToken, sha256 } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { ActionError, runAction } from "@/server/actions/result";

const roleSchema = z.enum(["ADMIN", "MODERATOR", "TEACHER"]);

const createSchema = z.object({
  name: z.string().trim().min(2, "nameRequired").max(120),
  email: z.string().trim().toLowerCase().email("emailInvalid"),
  role: roleSchema,
  school: z.string().trim().max(200).optional().transform((v) => v || null),
  password: z.string().min(8, "passwordMin").max(200),
  canReview: z.boolean().default(false),
});

export async function createUserAction(input: z.input<typeof createSchema>) {
  return runAction(async () => {
    const admin = await authorize("users.manage");
    const data = createSchema.parse(input);
    if (await db.user.findUnique({ where: { email: data.email } })) throw new ActionError("emailTaken");
    const user = await db.user.create({
      data: { name: data.name, email: data.email, role: data.role, school: data.school, canReview: data.role === "MODERATOR" && data.canReview, passwordHash: await hashPassword(data.password) },
    });
    await audit({ actorId: admin.id, action: "user.create", entityType: "User", entityId: user.id, metadata: { email: user.email, role: user.role } });
    revalidatePath("/admin/users");
    return { message: "accountCreated", vars: { email: user.email } };
  });
}

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  role: roleSchema,
  school: z.string().trim().max(200).optional().transform((v) => v || null),
  canReview: z.boolean(),
});

export async function updateUserAction(userId: string, input: z.input<typeof updateSchema>) {
  return runAction(async () => {
    const admin = await authorize("users.manage");
    const data = updateSchema.parse(input);
    const target = await db.user.findUnique({ where: { id: z.string().cuid().parse(userId) } });
    if (!target) throw new ActionError("userNotFound");
    if (target.id === admin.id && data.role !== "ADMIN") throw new ActionError("cannotDemoteSelf");
    if (target.role === "ADMIN" && data.role !== "ADMIN") {
      const admins = await db.user.count({ where: { role: "ADMIN", isBlocked: false } });
      if (admins <= 1) throw new ActionError("lastAdmin");
    }
    await db.user.update({ where: { id: target.id }, data: { ...data, canReview: data.role === "MODERATOR" && data.canReview } });
    if (target.role !== data.role) await db.session.deleteMany({ where: { userId: target.id } });
    await audit({ actorId: admin.id, action: "user.update", entityType: "User", entityId: target.id, metadata: { from: target.role, to: data.role, canReview: data.canReview } });
    revalidatePath("/admin/users");
    return { message: "changesSaved" };
  });
}

export async function setBlockedAction(userId: string, blocked: boolean) {
  return runAction(async () => {
    const admin = await authorize("users.manage");
    const id = z.string().cuid().parse(userId);
    if (id === admin.id) throw new ActionError("cannotBlockSelf");
    const target = await db.user.findUnique({ where: { id } });
    if (!target) throw new ActionError("userNotFound");
    await db.user.update({ where: { id }, data: { isBlocked: blocked } });
    if (blocked) await db.session.deleteMany({ where: { userId: id } });
    await audit({ actorId: admin.id, action: blocked ? "user.block" : "user.unblock", entityType: "User", entityId: id, metadata: { email: target.email } });
    revalidatePath("/admin/users");
    return { message: blocked ? "userBlocked" : "userUnblocked" };
  });
}

/** Generates a one-hour password reset link the admin can hand over (no mail transport in MVP). */
export async function createResetLinkAction(userId: string) {
  return runAction(async () => {
    const admin = await authorize("users.manage");
    const user = await db.user.findUnique({ where: { id: z.string().cuid().parse(userId) } });
    if (!user) throw new ActionError("userNotFound");
    const token = newToken();
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) } });
    await audit({ actorId: admin.id, action: "user.reset_link", entityType: "User", entityId: user.id, metadata: { email: user.email } });
    return { link: `${env.APP_URL}/reset-password/${token}` };
  });
}
