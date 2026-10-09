import type { Metadata } from "next";
import { loadViewableLesson } from "@/features/lessons/server/access";
import { PresentMode } from "@/features/lessons/components/present-mode";
import { defaultStages, type StageView } from "@/features/lessons/stages";
import { getDictionary } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).lesson.lessonTitle };
}

export default async function PresentPage({ params, searchParams }: PageProps<"/teacher/lesson/[id]/present">) {
  const { id } = await params;
  const { stage } = await searchParams;
  const { lesson } = await loadViewableLesson(id);

  const authored: StageView[] = lesson.stages.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    minutes: s.durationMinutes,
    activity: s.activity,
    resourceId: s.resourceId,
    slideFrom: s.slideFrom,
    slideTo: s.slideTo,
    quizId: s.quizId,
    gameId: s.gameId,
  }));
  const stages = authored.length ? authored : defaultStages(lesson, (await getDictionary()).present.defaultStages);

  return (
    <PresentMode
      lesson={{
        id: lesson.id,
        title: lesson.title,
        lessonNumber: lesson.lessonNumber,
        durationMinutes: lesson.durationMinutes,
        researchQuestion: lesson.researchQuestion,
        resources: lesson.resources.map((r) => ({ id: r.id, type: r.type, title: r.title, previewKind: r.previewKind, previewPages: r.previewPages, fileUrl: r.fileUrl, externalUrl: r.externalUrl, content: r.content })),
        quizzes: lesson.quizzes.map((q) => ({ id: q.id, title: q.title, questions: q.questions })),
        games: lesson.games.map((g) => ({ id: g.id, type: g.type, title: g.title, instructions: g.instructions, items: g.items.map((i) => ({ id: i.id, points: i.points, data: i.data })) })),
      }}
      stages={stages}
      isDefaultPlan={!authored.length}
      initialStage={Math.max(0, Number(stage) || 0)}
    />
  );
}
