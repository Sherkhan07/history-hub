import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { clientIp } from "@/server/auth/session";

export type AuditEntry = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function audit(entry: AuditEntry) {
  let ip: string | null = null;
  try {
    ip = await clientIp();
  } catch {
    ip = null; // outside a request (seed/scripts)
  }
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata,
      ip,
    },
  });
}
