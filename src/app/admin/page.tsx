import type { Metadata } from "next";
import Link from "next/link";
import { dashboardStats, recentActivity, viewsByDay } from "@/features/admin/queries";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { SectionCard } from "@/components/common/form-controls";
import { BarChart } from "@/features/admin/components/bar-chart";
import { actionLabel } from "@/features/moderation/components/history-timeline";
import { relativeTime } from "@/lib/format";
import { getI18n, getDictionary } from "@/i18n";
import { fmt, intlLocale } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).admin.dashboardMeta };
}

export default async function AdminDashboard() {
  const [s, days, activity, { t, locale }] = await Promise.all([dashboardStats(), viewsByDay(14), recentActivity(12), getI18n()]);
  const L = intlLocale(locale);
  return (
    <>
      <PageHeader title={t.admin.dashboard} description={t.admin.dashboardText} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={t.admin.teachers} value={s.teachers} icon="Users" />
        <StatCard label={t.admin.lessons} value={s.lessons} icon="BookOpen" tone="gold" hint={fmt(t.admin.moderatorsN, { n: s.moderators })} />
        <StatCard label={t.admin.published} value={s.published} icon="CheckCircle2" tone="sage" />
        <StatCard label={t.admin.inModeration} value={s.inReview} icon="Inbox" tone="clay" />
        <StatCard label={t.admin.lessonViews} value={s.views} icon="Presentation" hint={fmt(t.admin.last30, { n: s.views30 })} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard title={t.admin.views14}>
          <BarChart label={t.admin.viewsByDay} data={days.map((d) => ({ label: d.date.toLocaleDateString(L, { day: "numeric", month: "short" }), value: d.count }))} />
          <p className="mt-4 text-sm text-muted-foreground">{fmt(t.admin.sessionsLine, { s: s.sessions, p: s.participants })}</p>
        </SectionCard>
        <SectionCard title={t.admin.recentActions} actions={<Link href="/admin/audit-log" className="text-sm text-steppe hover:underline">{t.admin.fullLog}</Link>}>
          <ol className="space-y-2.5">
            {activity.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{relativeTime(a.createdAt, L)}</span>
                <span className="flex-1">
                  {actionLabel(a.action, t)}
                  {a.metadata && typeof a.metadata === "object" && "title" in a.metadata ? <span className="text-muted-foreground"> · {String(a.metadata.title)}</span> : null}
                </span>
                <span className="truncate text-muted-foreground">{a.actor?.name ?? t.common.system}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>
    </>
  );
}
