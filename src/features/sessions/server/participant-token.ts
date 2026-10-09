import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { PARTICIPANT_COOKIE_PREFIX } from "@/lib/constants";

/** Resolves the participant cookie for the newest session with this PIN. */
export async function participantToken(pin: string): Promise<string | undefined> {
  const s = await db.gameSession.findFirst({ where: { pin }, orderBy: { createdAt: "desc" }, select: { id: true } });
  if (!s) return undefined;
  return (await cookies()).get(`${PARTICIPANT_COOKIE_PREFIX}${s.id}`)?.value;
}
