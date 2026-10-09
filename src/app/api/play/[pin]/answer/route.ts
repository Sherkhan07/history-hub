import type { NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/server/rate-limit";
import { getDictionary } from "@/i18n";
import { translateMsg } from "@/i18n/msg";
import { assertSameOrigin, clientIpFrom, json } from "@/server/http";
import { AnswerError, submitAnswer } from "@/features/sessions/server/engine";
import { participantToken } from "@/features/sessions/server/participant-token";

const schema = z.object({ itemId: z.string().min(1).max(40), answer: z.unknown() });

export async function POST(request: NextRequest, ctx: RouteContext<"/api/play/[pin]/answer">) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const { pin } = await ctx.params;
  if (!/^\d{6}$/.test(pin)) return json({ error: "Not found" }, 404);
  const t = await getDictionary();
  const token = await participantToken(pin);
  if (!rateLimit(`answer:${token ?? clientIpFrom(request)}`, 30, 60_000).ok) return json({ error: t.msg.tooOften }, 429);
  const body = schema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return json({ error: t.msg.badAnswer }, 400);
  try {
    return json(await submitAnswer(pin, token, body.data.itemId, body.data.answer));
  } catch (e) {
    if (e instanceof AnswerError) return json({ error: translateMsg(t, e.message) }, 409);
    throw e;
  }
}
