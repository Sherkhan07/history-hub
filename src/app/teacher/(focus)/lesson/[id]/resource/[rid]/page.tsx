import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { loadViewableLesson } from "@/features/lessons/server/access";
import { FocusBar } from "@/components/layout/focus-bar";
import { ResourcePreview } from "@/features/resources/components/resource-preview";
import { TasksView } from "@/features/resources/components/tasks-view";
import { CardsView } from "@/features/resources/components/cards-view";
import { parseCards, parseHomework, parseTasks } from "@/features/resources/content";
import { PrintButton } from "@/features/resources/components/print-button";
import { Button } from "@/components/ui/button";
import { fileUrl } from "@/lib/files";
import { formatFileSize } from "@/lib/format";
import { getDictionary } from "@/i18n";
import { fmt } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).lesson.material };
}

export default async function ResourcePage({ params }: PageProps<"/teacher/lesson/[id]/resource/[rid]">) {
  const { id, rid } = await params;
  const [{ lesson }, t] = await Promise.all([loadViewableLesson(id), getDictionary()]);
  const r = lesson.resources.find((x) => x.id === rid);
  if (!r) notFound();

  const tasks = r.type === "TASK" ? parseTasks(r.content) : [];
  const cards = r.type === "CARDS" ? parseCards(r.content) : [];
  const homework = r.type === "HOMEWORK" ? parseHomework(r.content) : null;
  const printable = tasks.length > 0 || homework || r.type === "WORKSHEET";

  return (
    <>
      <FocusBar
        backHref={`/teacher/lesson/${lesson.id}`}
        title={r.title}
        backLabel={t.lesson.toLesson}
        subtitle={fmt(t.lesson.resourceSub, { type: t.resourceTypes[r.type], n: lesson.lessonNumber, title: lesson.title })}
        actions={
          <div className="no-print flex gap-2">
            {r.previewKind === "PDF" && r.previewPages[0] ? (
              <Button asChild variant="outline">
                <a href={fileUrl(r.previewPages[0])!} target="_blank" rel="noopener">
                  <Printer /> <span className="hidden sm:inline">{t.common.print}</span>
                </a>
              </Button>
            ) : (
              printable && <PrintButton />
            )}
            {r.fileUrl && (
              <Button asChild variant="outline">
                <a href={`${fileUrl(r.fileUrl)}?download=1`}>
                  <Download /> <span className="hidden sm:inline">{t.common.original}</span>
                  <span className="hidden text-muted-foreground lg:inline">· {formatFileSize(r.fileSize)}</span>
                </a>
              </Button>
            )}
          </div>
        }
      />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8">
        {r.description && <p className="mb-4 max-w-3xl text-muted-foreground">{r.description}</p>}
        {tasks.length > 0 ? (
          <div className="mx-auto max-w-4xl"><TasksView tasks={tasks} large /></div>
        ) : cards.length > 0 ? (
          <div className="mx-auto max-w-4xl"><CardsView cards={cards} /></div>
        ) : homework && !r.fileUrl ? (
          <div className="mx-auto max-w-3xl rounded-3xl border bg-card p-10 shadow-soft">
            <p className="mb-3 text-sm font-medium tracking-wide text-muted-foreground uppercase">{t.lesson.homeworkLabel}</p>
            <p className="font-heading text-2xl leading-relaxed whitespace-pre-line">{homework}</p>
          </div>
        ) : (
          <ResourcePreview resource={r} />
        )}
      </main>
    </>
  );
}
