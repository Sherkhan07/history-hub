import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireUser } from "@/server/auth/guards";
import { HostScreen } from "@/features/sessions/components/host-screen";
import { publicOrigin } from "@/server/http";
import { getDictionary } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).session.hostTitle };
}

export default async function HostPage({ params, searchParams }: PageProps<"/teacher/sessions/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const { return: ret } = await searchParams;
  const s = await db.gameSession.findUnique({ where: { id }, select: { teacherId: true, lessonId: true } });
  if (!s || (s.teacherId !== user.id && user.role !== "ADMIN")) notFound();
  const origin = publicOrigin(await headers(), env.APP_URL);
  const back = typeof ret === "string" && ret.startsWith("/teacher/") ? ret : `/teacher/lesson/${s.lessonId}`;
  return <HostScreen sessionId={id} joinUrl={`${origin.replace(/^https?:\/\//, "")}/join`} backHref={back} />;
}
