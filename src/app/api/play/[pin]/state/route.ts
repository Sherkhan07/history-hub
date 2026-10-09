import type { NextRequest } from "next/server";
import { rateLimit } from "@/server/rate-limit";
import { clientIpFrom, json } from "@/server/http";
import { getParticipantState } from "@/features/sessions/server/engine";
import { participantToken } from "@/features/sessions/server/participant-token";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/play/[pin]/state">) {
  const { pin } = await ctx.params;
  if (!/^\d{6}$/.test(pin)) return json({ found: false }, 404);
  // Students poll every ~1.5s; cap per IP generously (a whole class may share one NAT IP)
  if (!rateLimit(`poll:${clientIpFrom(request)}`, 2400, 60_000).ok) return json({ error: "Too many requests" }, 429);
  return json(await getParticipantState(pin, await participantToken(pin)));
}
