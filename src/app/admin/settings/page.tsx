import type { Metadata } from "next";
import { requireRole } from "@/server/auth/guards";
import { getSettings } from "@/server/settings";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/form-controls";
import { SettingsForm } from "@/features/admin/components/curriculum-editors";
import { getDictionary } from "@/i18n";
import { fmt } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).admin.settings };
}

export default async function SettingsPage() {
  await requireRole("ADMIN");
  const [s, t] = await Promise.all([getSettings(), getDictionary()]);
  return (
    <>
      <PageHeader title={t.admin.settings} description={t.admin.settingsText} />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard title={t.admin.platform}>
          <SettingsForm initial={{ maxMb: s["uploads.maxSizeMb"], year: s["platform.academicYear"], announcement: s["platform.announcement"], time: s["sessions.defaultTimePerQuestion"] }} />
        </SectionCard>
        <SectionCard title={t.admin.environment} description={t.admin.environmentText}>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-muted-foreground">{t.admin.storage}</dt><dd className="font-mono">{env.STORAGE_DRIVER === "s3" ? `S3 · ${env.S3_BUCKET}` : fmt(t.admin.storageLocal, { dir: env.STORAGE_LOCAL_DIR })}</dd></div>
            <div><dt className="text-muted-foreground">{t.admin.qrAddress}</dt><dd className="font-mono">{env.APP_URL}</dd></div>
            <div><dt className="text-muted-foreground">{t.admin.conversion}</dt><dd>{env.SOFFICE_PATH ? t.admin.conversionOn : t.admin.conversionOff}</dd></div>
          </dl>
        </SectionCard>
      </div>
    </>
  );
}
