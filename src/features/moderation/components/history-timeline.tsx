import { ModerationStatusBadge } from "@/components/common/badges";
import { SectionCard } from "@/components/common/form-controls";
import { formatDateTime } from "@/lib/format";
import { getI18n, type Dictionary } from "@/i18n";
import { fmt, intlLocale } from "@/i18n/format";
import type { lessonHistory } from "@/features/lessons/server/staff-queries";

type History = Awaited<ReturnType<typeof lessonHistory>>;

export function actionLabel(a: string, t: Dictionary) {
  return t.history.actions[a] ?? a;
}

export async function HistoryTimeline({ history }: { history: History }) {
  const { t, locale } = await getI18n();
  const L = intlLocale(locale);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title={t.history.moderation} description={t.history.moderationText}>
        {history.requests.length ? (
          <ol className="space-y-3">
            {history.requests.map((r) => (
              <li key={r.id} className="rounded-xl border p-3 text-sm">
                <p className="font-medium">
                  {r.decision === "PENDING" ? t.history.pending : r.decision === "APPROVED" ? t.history.approved : t.history.rejected}
                </p>
                <p className="text-muted-foreground">{fmt(t.history.sentBy, { name: r.submittedBy.name, when: formatDateTime(r.submittedAt, L) })}</p>
                {r.submitNote && <p className="mt-1">«{r.submitNote}»</p>}
                {r.reviewer && <p className="mt-1 text-muted-foreground">{fmt(t.history.decision, { name: r.reviewer.name })}{r.reviewedAt ? ` · ${formatDateTime(r.reviewedAt, L)}` : ""}</p>}
                {r.comment && <p className="mt-1 rounded-lg bg-clay-soft px-3 py-2">{r.comment}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">{t.history.noRequests}</p>
        )}
        <h3 className="mt-6 mb-3 font-heading font-semibold">{t.history.versions}</h3>
        {history.versions.length ? (
          <ol className="space-y-2">
            {history.versions.map((v) => (
              <li key={v.id} className="flex items-center gap-3 text-sm">
                <span className="w-8 font-mono text-muted-foreground">v{v.version}</span>
                <ModerationStatusBadge status={v.status} />
                <span className="flex-1 truncate">{v.note}</span>
                <span className="text-xs text-muted-foreground">{v.createdBy.name} · {formatDateTime(v.createdAt, L)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">{t.history.noVersions}</p>
        )}
      </SectionCard>
      <SectionCard title={t.history.log}>
        <ol className="space-y-2">
          {history.logs.map((l) => (
            <li key={l.id} className="flex gap-3 text-sm">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">{formatDateTime(l.createdAt, L)}</span>
              <span className="flex-1">{actionLabel(l.action, t)}</span>
              <span className="text-muted-foreground">{l.actor?.name ?? t.common.system}</span>
            </li>
          ))}
        </ol>
      </SectionCard>
    </div>
  );
}
