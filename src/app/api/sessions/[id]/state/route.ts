import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getHostState } from "@/features/sessions/server/engine";
import { json } from "@/server/http";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/sessions/[id]/state">) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  const { id } = await ctx.params;
  const state = await getHostState(id);
  if (!state || (state.teacherId !== user.id && user.role !== "ADMIN")) return json({ error: "Not found" }, 404);
  return json(state);
}
