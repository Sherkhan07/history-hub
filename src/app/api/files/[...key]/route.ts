import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/server/storage";
import { getCurrentUser } from "@/server/auth/session";
import { canReadKey, contentDisposition, contentTypeFor } from "@/server/files-access";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/files/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.map(decodeURIComponent).join("/");
  if (key.includes("..")) return new NextResponse("Bad request", { status: 400 });

  const user = await getCurrentUser();
  if (!(await canReadKey(user, key))) {
    return new NextResponse(user ? "Forbidden" : "Unauthorized", { status: user ? 403 : 401 });
  }

  const store = storage();
  const info = await store.stat(key);
  if (!info) return new NextResponse("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": contentTypeFor(key),
    "Accept-Ranges": "bytes",
    // Keys are versioned (…/v{n}/…), so previews can be cached aggressively per user
    "Cache-Control": key.startsWith("public/") ? "public, max-age=86400" : "private, max-age=86400",
    "X-Content-Type-Options": "nosniff",
  });

  if (request.nextUrl.searchParams.get("download") === "1") {
    const resource = await db.resource.findFirst({ where: { fileUrl: key }, select: { originalName: true } });
    headers.set("Content-Disposition", contentDisposition("attachment", resource?.originalName ?? key.split("/").pop()!));
  }

  const range = request.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (start >= info.size || start > end) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    }
    const obj = await store.get(key, { start, end });
    if (!obj) return new NextResponse("Not found", { status: 404 });
    headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new NextResponse(obj.body, { status: 206, headers });
  }

  const obj = await store.get(key);
  if (!obj) return new NextResponse("Not found", { status: 404 });
  headers.set("Content-Length", String(info.size));
  return new NextResponse(obj.body, { status: 200, headers });
}
