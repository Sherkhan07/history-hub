import QRCode from "qrcode";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/server/auth/session";
import { publicOrigin } from "@/server/http";

/** QR code (SVG) pointing to /join?pin=XXXXXX for the host screen. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/sessions/[id]/qr">) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const s = await db.gameSession.findUnique({ where: { id }, select: { pin: true, teacherId: true } });
  if (!s || (s.teacherId !== user.id && user.role !== "ADMIN")) return new NextResponse("Not found", { status: 404 });
  const origin = publicOrigin(request.headers, env.APP_URL);
  const svg = await QRCode.toString(`${origin}/join?pin=${s.pin}`, { type: "svg", margin: 1, color: { dark: "#1c2333", light: "#ffffff" } });
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=3600" } });
}
