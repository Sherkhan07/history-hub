import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { PARTICIPANT_COOKIE_PREFIX } from "@/lib/constants";
import { getDictionary } from "@/i18n";
import { translateMsg } from "@/i18n/msg";
import { rateLimit } from "@/server/rate-limit";
import { assertSameOrigin, clientIpFrom, json } from "@/server/http";
import { JoinError, joinSession } from "@/features/sessions/server/engine";

const schema = z.object({
  pin: z.string().regex(/^\d{6}$/, "pinFormat"),
  name: z.string().trim().min(2, "nameMin").max(30, "nameMax"),
});

export async function POST(request: NextRequest) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const t = await getDictionary();
  const ip = clientIpFrom(request);
  if (!rateLimit(`join:${ip}`, 20, 60_000).ok) return json({ error: t.msg.waitMinute }, 429);

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return json({ error: translateMsg(t, parsed.error.issues[0]?.message ?? "formInvalid") }, 400);
  // Brute-force protection on PIN guessing
  if (!rateLimit(`join-pin:${ip}:${parsed.data.pin}`, 8, 60_000).ok) return json({ error: t.msg.waitMinute }, 429);

  try {
    const r = await joinSession(parsed.data.pin, parsed.data.name);
    (await cookies()).set(`${PARTICIPANT_COOKIE_PREFIX}${r.sessionId}`, r.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 6,
    });
    return json({ ok: true, pin: r.pin });
  } catch (e) {
    if (e instanceof JoinError) return json({ error: translateMsg(t, e.message) }, 400);
    throw e;
  }
}
