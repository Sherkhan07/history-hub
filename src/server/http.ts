import "server-only";
import { NextResponse, type NextRequest } from "next/server";

/** CSRF defence for JSON route handlers: same-origin requests only. */
export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null; // same-origin fetches from older browsers / non-browser clients without cookies
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (new URL(origin).host === host) return null;
  } catch {
    /* fallthrough */
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function clientIpFrom(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Origin students should open on their phones. The request host is used unless it is a loopback
 * address (teacher on localhost) — then APP_URL (e.g. the LAN address) is used instead.
 */
export function publicOrigin(h: Headers, appUrl: string): string {
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host || /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) return appUrl.replace(/\/$/, "");
  return `${h.get("x-forwarded-proto") ?? "http"}://${host}`;
}
