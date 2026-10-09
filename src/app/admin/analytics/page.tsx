import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/server/auth/guards";
import { activeTeachers, dashboardStats, topLessons, viewsByDay } from "@/features/admin/queries";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { SectionCard } from "@/components/common/form-controls";
import { BarChart } from "@/features/admin/components/bar-chart";
import { formatDateTime } from "@/lib/format";
import { getI18n, getDictionary } from "@/i18n";
import { fmt, intlLocale } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).admin.analytics };
}

export default async function AnalyticsPage() {
  await requireRole("ADMIN");
  const [s, days, top, teachers, { t, locale }] = await Promise.all([dashboardStats(), viewsByDay(30), topLessons(10), activeTeachers(8), getI18n()]);
  const L = intlLocale(locale);
  return (
    <>
      <PageHeader title={t.admin.analytics} description={t.admin.analyticsText} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.admin.lessonViews} value={s.views} icon="Presentation" hint={fmt(t.admin.last30, { n: s.views30 })} />
        <StatCard label={t.admin.classGames} value={s.sessions} icon="Gamepad2" tone="clay" />
        <StatCard label={t.admin.studentsInGames} value={s.participants} icon="Users" tone="sage" />
        <StatCard label={t.admin.publishedLessons} value={`${s.published}/${s.lessons}`} icon="CheckCircle2" tone="gold" />
      </div>
      <SectionCard title={t.admin.views30} className="mt-6">
        <BarChart label={t.admin.views30Label} data={days.map((d) => ({ label: d.date.toLocaleDateString(L, { day: "numeric", month: "short" }), value: d.count }))} />
      </SectionCard>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title={t.admin.popular}>
          {top.length ? (
            <ol className="space-y-2.5 text-sm">
              {top.map((l, i) => (
                <li key={l.id} className="flex items-center gap-3">
                  <span className="w-5 text-muted-foreground tabular-nums">{i + 1}</span>
                  <Link href={`/teacher/lesson/${l.id}`} className="min-w-0 flex-1 truncate hover:text-steppe">{l.lessonNumber}. {l.title}</Link>
                  <span className="text-muted-foreground tabular-nums">{fmt(t.admin.viewsShort, { n: l.views })} · ★ {l._count.favorites}</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-muted-foreground">{t.admin.noData}</p>}
        </SectionCard>
        <SectionCard title={t.admin.activeTeachers}>
          {teachers.length ? (
            <ol className="space-y-2.5 text-sm">
              {teachers.map((tc) => (
                <li key={tc.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate">{tc.name}{tc.school ? <span className="text-muted-foreground"> · {tc.school}</span> : null}</span>
                  <span className="text-muted-foreground tabular-nums">{fmt(t.admin.viewsShort, { n: tc.views })}{tc.lastLoginAt ? ` · ${formatDateTime(tc.lastLoginAt, L)}` : ""}</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-muted-foreground">{t.admin.noData}</p>}
        </SectionCard>
      </div>
    </>
  );
}
