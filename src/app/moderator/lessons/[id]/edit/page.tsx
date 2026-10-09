import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Eye, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth/guards";
import { can, canEditLesson } from "@/server/auth/permissions";
import { getCurrentUser } from "@/server/auth/session";
import { getSettings } from "@/server/settings";
import { getCurriculumTree } from "@/features/curriculum/server/queries";
import { getLessonDetail } from "@/features/lessons/server/queries";
import { lessonHistory } from "@/features/lessons/server/staff-queries";
import { BasicsForm } from "@/features/lessons/components/editor/basics-form";
import { ObjectivesEditor } from "@/features/lessons/components/editor/objectives-editor";
import { MaterialsManager } from "@/features/lessons/components/editor/materials-manager";
import { CardsEditor, HomeworkEditor, TasksEditor } from "@/features/lessons/components/editor/structured-editor";
import { GamesManager } from "@/features/lessons/components/editor/games-manager";
import { ScenarioEditor } from "@/features/lessons/components/editor/scenario-editor";
import { QuizEditor } from "@/features/quizzes/components/quiz-editor";
import { HistoryTimeline } from "@/features/moderation/components/history-timeline";
import { WorkflowActions } from "@/features/moderation/components/workflow-actions";
import { reviewBlockers } from "@/features/moderation/workflow";
import { buildMaterialTiles } from "@/features/lessons/tiles";
import { MaterialsGrid } from "@/features/lessons/components/materials-grid";
import { LearningObjectiveBadge } from "@/features/lessons/components/lesson-header";
import { defaultStages } from "@/features/lessons/stages";
import { parseCards, parseHomework, parseTasks } from "@/features/resources/content";
import { ModerationStatusBadge } from "@/components/common/badges";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/common/form-controls";
import { romanQuarter } from "@/lib/format";
import { getDictionary, getI18n } from "@/i18n";
import { fmt } from "@/i18n/format";
import { subjectName } from "@/features/curriculum/subject-name";
import { cn } from "@/lib/utils";

const TABS = ["basics", "objectives", "materials", "tasks", "quiz", "games", "scenario", "preview", "history"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata({ params }: PageProps<"/moderator/lessons/[id]/edit">): Promise<Metadata> {
  const { id } = await params;
  const [user, t] = await Promise.all([getCurrentUser(), getDictionary()]);
  if (!can(user, "lessons.viewAll")) return { title: t.editor.title };
  const l = await db.lesson.findUnique({ where: { id }, select: { title: true } });
  return { title: l ? fmt(t.editor.titleOf, { title: l.title }) : t.editor.title };
}

export default async function EditLessonPage({ params, searchParams }: PageProps<"/moderator/lessons/[id]/edit">) {
  const user = await requireRole("MODERATOR", "ADMIN");
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = TABS.find((t) => t === sp.tab) ?? "basics";
  const [lesson, { t, locale }] = await Promise.all([getLessonDetail(id), getI18n()]);
  if (!lesson) notFound();
  const readOnly = !canEditLesson(user, lesson.status);
  const c = lesson.section.quarter.curriculum;
  const lastRejection = lesson.status === "REJECTED"
    ? await db.moderationRequest.findFirst({ where: { lessonId: lesson.id, decision: "REJECTED" }, orderBy: { reviewedAt: "desc" }, select: { comment: true, reviewer: { select: { name: true } } } })
    : null;
  const blockers = reviewBlockers({ title: lesson.title, objectives: lesson.objectives.length, resources: lesson.resources.length, quizzes: lesson.quizzes.length, games: lesson.games.length });

  const counts: Partial<Record<Tab, number>> = {
    objectives: lesson.objectives.length,
    materials: lesson.resources.length,
    tasks: lesson.resources.filter((r) => ["TASK", "CARDS", "HOMEWORK"].includes(r.type)).length,
    quiz: lesson.quizzes.reduce((n, q) => n + q.questions.length, 0),
    games: lesson.games.length,
    scenario: lesson.stages.length,
  };

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <p className="text-sm text-muted-foreground">
          <Link href="/moderator/lessons" className="hover:text-foreground">{t.editor.lessons}</Link> / {fmt(t.workflow.where, { grade: c.grade.number, subject: subjectName(c.subject, locale), q: romanQuarter(lesson.section.quarter.number) })} · {lesson.section.title}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <ModerationStatusBadge status={lesson.status} />
              <span className="text-sm text-muted-foreground">{fmt(t.editor.author, { name: lesson.createdBy.name })}</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-balance sm:text-3xl">{lesson.lessonNumber}. {lesson.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost"><Link href={`/teacher/lesson/${lesson.id}`} target="_blank"><Eye /> {t.editor.asTeacher}</Link></Button>
            <WorkflowActions lessonId={lesson.id} status={lesson.status} actor={user} />
          </div>
        </div>
        {lastRejection?.comment && (
          <div className="flex gap-3 rounded-2xl border border-clay/30 bg-clay-soft px-5 py-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-clay" />
            <div>
              <p className="font-medium">{t.editor.reviewerNotes}{lastRejection.reviewer ? ` (${lastRejection.reviewer.name})` : ""}</p>
              <p className="mt-1 text-sm whitespace-pre-line">{lastRejection.comment}</p>
            </div>
          </div>
        )}
        {readOnly && (
          <div className="flex items-center gap-3 rounded-2xl border bg-muted/60 px-5 py-3 text-sm">
            <Lock className="size-4 text-muted-foreground" />
            {lesson.status === "IN_REVIEW" || lesson.status === "APPROVED"
              ? t.editor.lockedReview
              : lesson.status === "PUBLISHED"
                ? t.editor.lockedPublished
                : t.editor.lockedArchived}
          </div>
        )}
        {!readOnly && blockers.length > 0 && (lesson.status === "DRAFT" || lesson.status === "REJECTED") && (
          <p className="text-sm text-muted-foreground">{fmt(t.editor.toSubmit, { list: blockers.map((b) => t.workflow.blockers[b]).join(" · ") })}</p>
        )}
      </header>

      <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-muted p-1.5 scrollbar-none" aria-label={t.editor.tabsLabel}>
        {TABS.map((tb) => (
          <Link
            key={tb}
            href={`/moderator/lessons/${lesson.id}/edit?tab=${tb}`}
            scroll={false}
            aria-current={tab === tb ? "page" : undefined}
            className={cn("flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm whitespace-nowrap transition-colors", tab === tb ? "bg-card font-medium shadow-soft" : "text-muted-foreground hover:text-foreground")}
          >
            {t.editor.tabs[tb]}
            {counts[tb] ? <span className="rounded-full bg-background px-1.5 text-xs">{counts[tb]}</span> : null}
          </Link>
        ))}
      </nav>

      {tab === "basics" && <BasicsTab lesson={lesson} readOnly={readOnly} />}
      {tab === "objectives" && <ObjectivesEditor lessonId={lesson.id} initial={lesson.objectives.map((o) => ({ code: o.code, text: o.text }))} readOnly={readOnly} />}
      {tab === "materials" && <MaterialsTab lesson={lesson} readOnly={readOnly} />}
      {tab === "tasks" && <TasksTab lesson={lesson} readOnly={readOnly} />}
      {tab === "quiz" && (
        <div className="space-y-6">
          {lesson.quizzes.map((q) => (
            <QuizEditor
              key={q.id + q.questions.length}
              lessonId={lesson.id}
              readOnly={readOnly}
              quiz={{
                id: q.id,
                title: q.title,
                description: q.description,
                timePerQuestion: q.timePerQuestion,
                questions: q.questions.map((x) => ({ type: x.type, prompt: x.prompt, explanation: x.explanation, points: x.points, options: [...x.options].sort((a, b) => (x.type === "ORDERING" ? (a.correctOrder ?? 0) - (b.correctOrder ?? 0) : a.sortOrder - b.sortOrder)).map((o) => ({ text: o.text, isCorrect: o.isCorrect, matchText: o.matchText })) })),
              }}
            />
          ))}
          {!readOnly && (
            <QuizEditor
              key={`new-${lesson.quizzes.length}`}
              lessonId={lesson.id}
              quiz={{ id: null, title: lesson.quizzes.length ? t.editor.extraQuiz : fmt(t.editor.quizFor, { title: lesson.title }), description: null, timePerQuestion: 30, questions: [] }}
            />
          )}
        </div>
      )}
      {tab === "games" && (
        <GamesManager
          lessonId={lesson.id}
          readOnly={readOnly}
          games={lesson.games.map((g) => ({ id: g.id, type: g.type, title: g.title, instructions: g.instructions, items: g.items.map((i) => ({ points: i.points, data: i.data })) }))}
        />
      )}
      {tab === "scenario" && (
        <ScenarioEditor
          lessonId={lesson.id}
          readOnly={readOnly}
          duration={lesson.durationMinutes}
          defaults={defaultStages(lesson, t.present.defaultStages)}
          initial={lesson.stages.map((s) => ({ title: s.title, description: s.description ?? "", durationMinutes: s.durationMinutes, activity: s.activity, resourceId: s.resourceId, slideFrom: s.slideFrom, slideTo: s.slideTo, quizId: s.quizId, gameId: s.gameId }))}
          resources={lesson.resources.map((r) => ({ id: r.id, title: r.title, type: r.type, pageCount: r.pageCount }))}
          quizzes={lesson.quizzes.map((q) => ({ id: q.id, title: q.title }))}
          games={lesson.games.map((g) => ({ id: g.id, title: g.title, type: g.type }))}
        />
      )}
      {tab === "preview" && (
        <div className="space-y-6">
          <SectionCard title={t.editor.previewTitle} actions={<Button asChild variant="outline"><Link href={`/teacher/lesson/${lesson.id}`} target="_blank"><Eye /> {t.editor.openFull}</Link></Button>}>
            {lesson.researchQuestion && <p className="mb-4 rounded-xl border-l-4 border-gold bg-gold-soft/70 px-4 py-3 font-heading">{lesson.researchQuestion}</p>}
            {lesson.objectives.length > 0 && <ul className="mb-6 space-y-2">{lesson.objectives.map((o) => <LearningObjectiveBadge key={o.id} code={o.code} text={o.text} className="bg-muted/60" />)}</ul>}
            <MaterialsGrid tiles={buildMaterialTiles(lesson, t)} />
          </SectionCard>
        </div>
      )}
      {tab === "history" && <HistoryTimeline history={await lessonHistory(lesson.id)} />}
    </div>
  );
}

type Detail = NonNullable<Awaited<ReturnType<typeof getLessonDetail>>>;

async function BasicsTab({ lesson, readOnly }: { lesson: Detail; readOnly: boolean }) {
  const tree = await getCurriculumTree();
  return (
    <BasicsForm
      tree={tree}
      lessonId={lesson.id}
      readOnly={readOnly}
      initial={{
        sectionId: lesson.sectionId,
        lessonNumber: lesson.lessonNumber,
        title: lesson.title,
        researchQuestion: lesson.researchQuestion ?? "",
        description: lesson.description ?? "",
        durationMinutes: lesson.durationMinutes,
        keywords: lesson.keywords.join(", "),
        language: lesson.language === "ru" ? "ru" : "kk",
      }}
    />
  );
}

async function MaterialsTab({ lesson, readOnly }: { lesson: Detail; readOnly: boolean }) {
  const settings = await getSettings();
  return (
    <MaterialsManager
      lessonId={lesson.id}
      readOnly={readOnly}
      maxMb={settings["uploads.maxSizeMb"]}
      resources={lesson.resources.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        originalName: r.originalName,
        fileSize: r.fileSize,
        fileUrl: r.fileUrl,
        externalUrl: r.externalUrl,
        previewKind: r.previewKind,
        previewUrl: r.previewUrl,
        pageCount: r.pageCount,
        language: r.language,
        version: r.version,
        hasContent: r.content != null,
      }))}
    />
  );
}

async function TasksTab({ lesson, readOnly }: { lesson: Detail; readOnly: boolean }) {
  const t = await getDictionary();
  const task = lesson.resources.find((r) => r.type === "TASK" && r.content);
  const cards = lesson.resources.find((r) => r.type === "CARDS" && r.content);
  const hw = lesson.resources.find((r) => r.type === "HOMEWORK" && r.content);
  return (
    <div className="space-y-6">
      <TasksEditor key={task?.id ?? "new-task"} lessonId={lesson.id} resourceId={task?.id ?? null} title={task?.title ?? t.editor.defaultTasksTitle} tasks={task ? parseTasks(task.content) : []} readOnly={readOnly} />
      <CardsEditor key={cards?.id ?? "new-cards"} lessonId={lesson.id} resourceId={cards?.id ?? null} title={cards?.title ?? t.editor.defaultCardsTitle} cards={cards ? parseCards(cards.content) : []} readOnly={readOnly} />
      <HomeworkEditor key={hw?.id ?? "new-hw"} lessonId={lesson.id} resourceId={hw?.id ?? null} text={hw ? (parseHomework(hw.content) ?? "") : ""} readOnly={readOnly} />
    </div>
  );
}
