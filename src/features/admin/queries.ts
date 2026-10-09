import "server-only";
import { db } from "@/lib/db";

export async function dashboardStats() {
  const since30 = new Date(Date.now() - 30 * 86400_000);
  const [teachers, moderators, lessons, published, inReview, views, views30, sessions, participants] = await Promise.all([
    db.user.count({ where: { role: "TEACHER" } }),
    db.user.count({ where: { role: "MODERATOR" } }),
    db.lesson.count({ where: { status: { not: "ARCHIVED" } } }),
    db.lesson.count({ where: { status: "PUBLISHED" } }),
    db.lesson.count({ where: { status: { in: ["IN_REVIEW", "APPROVED"] } } }),
    db.lessonView.count(),
    db.lessonView.count({ where: { viewedAt: { gte: since30 } } }),
    db.gameSession.count(),
    db.sessionParticipant.count(),
  ]);
  return { teachers, moderators, lessons, published, inReview, views, views30, sessions, participants };
}

export async function viewsByDay(days = 14) {
  const since = new Date(Date.now() - (days - 1) * 86400_000);
  since.setHours(0, 0, 0, 0);
  const rows = await db.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', "viewedAt") AS day, count(*) AS count
    FROM "LessonView" WHERE "viewedAt" >= ${since}
    GROUP BY 1 ORDER BY 1`;
  const map = new Map(rows.map((r) => [new Date(r.day).toDateString(), Number(r.count)]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(since.getTime() + i * 86400_000);
    return { date: d, count: map.get(d.toDateString()) ?? 0 };
  });
}

export async function topLessons(limit = 10) {
  const rows = await db.lessonView.groupBy({ by: ["lessonId"], _count: { lessonId: true }, orderBy: { _count: { lessonId: "desc" } }, take: limit });
  const lessons = await db.lesson.findMany({ where: { id: { in: rows.map((r) => r.lessonId) } }, select: { id: true, title: true, lessonNumber: true, _count: { select: { favorites: true } } } });
  const by = new Map(lessons.map((l) => [l.id, l]));
  return rows.flatMap((r) => (by.get(r.lessonId) ? [{ ...by.get(r.lessonId)!, views: r._count.lessonId }] : []));
}

export async function activeTeachers(limit = 8) {
  const rows = await db.lessonView.groupBy({ by: ["userId"], where: { user: { role: "TEACHER" } }, _count: { userId: true }, orderBy: { _count: { userId: "desc" } }, take: limit });
  const users = await db.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: { id: true, name: true, school: true, lastLoginAt: true } });
  const by = new Map(users.map((u) => [u.id, u]));
  return rows.flatMap((r) => (by.get(r.userId) ? [{ ...by.get(r.userId)!, views: r._count.userId }] : []));
}

export async function recentActivity(limit = 12) {
  return db.auditLog.findMany({
    where: { action: { notIn: ["auth.login", "auth.logout", "lesson.download"] } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, metadata: true, actor: { select: { name: true } } },
  });
}
