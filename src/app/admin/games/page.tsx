import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth/guards";
import { PageHeader } from "@/components/common/page-header";
import { Icon } from "@/components/common/icon";
import { StatCard } from "@/components/common/stat-card";
import { GAME_DEFINITIONS, GAME_TYPES } from "@/features/games/definitions";
import { getI18n, getDictionary } from "@/i18n";
import { fmt } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).admin.games };
}

export default async function AdminGamesPage() {
  await requireRole("ADMIN");
  const { t } = await getI18n();
  const [games, sessions] = await Promise.all([
    db.game.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, type: true, title: true, _count: { select: { items: true, sessions: true } }, lesson: { select: { id: true, title: true, lessonNumber: true } } } }),
    db.gameSession.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, pin: true, status: true, kind: true, createdAt: true, teacher: { select: { name: true } }, _count: { select: { participants: true } }, game: { select: { title: true } }, quiz: { select: { title: true } } } }),
  ]);
  return (
    <>
      <PageHeader title={t.admin.games} description={t.admin.gamesText} />
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {GAME_TYPES.map((gt) => <StatCard key={gt} label={t.gameTypes[gt]} value={games.filter((g) => g.type === gt).length} icon={GAME_DEFINITIONS[gt].icon} />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
          <ul className="divide-y">
            {games.map((g) => (
              <li key={g.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <Icon name={GAME_DEFINITIONS[g.type].icon} className="size-5 text-clay" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{g.title}</p>
                  <Link href={`/moderator/lessons/${g.lesson.id}/edit?tab=games`} className="truncate text-xs text-steppe hover:underline">{g.lesson.lessonNumber}. {g.lesson.title}</Link>
                </div>
                <span className="text-xs text-muted-foreground">{fmt(t.admin.gameItems, { i: g._count.items, s: g._count.sessions })}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="mb-3 font-heading font-semibold">{t.admin.lastSessions}</h2>
          {sessions.length ? (
            <ul className="space-y-2 text-sm">
              {sessions.map((s) => (
                <li key={s.id} className="flex justify-between gap-3">
                  <span className="truncate">{s.game?.title ?? s.quiz?.title} · {s.teacher.name}</span>
                  <span className="shrink-0 text-muted-foreground">{fmt(t.admin.sessionLine, { n: s._count.participants, status: s.status === "FINISHED" ? t.admin.sessionDone : t.admin.sessionLive })}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">{t.admin.noSessions}</p>}
        </div>
      </div>
    </>
  );
}
