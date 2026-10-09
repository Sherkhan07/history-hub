import type { StageActivity } from "@/generated/prisma/enums";
import type { Dictionary } from "@/i18n/dictionaries/ru";

type StageLabels = Dictionary["present"]["defaultStages"];

export type StageView = {
  id: string;
  title: string;
  description: string | null;
  minutes: number;
  activity: StageActivity;
  resourceId: string | null;
  slideFrom: number | null;
  slideTo: number | null;
  quizId: string | null;
  gameId: string | null;
};

type LessonLike = {
  durationMinutes: number;
  resources: { id: string; type: string; pageCount: number | null; previewKind: string }[];
  quizzes: { id: string }[];
  games: { id: string; type: string }[];
};

/**
 * Standard 45-minute lesson plan used when a moderator hasn't authored a scenario.
 * Links whatever materials the lesson has to the matching stage.
 */
export function defaultStages(lesson: LessonLike, l: StageLabels): StageView[] {
  const pres = lesson.resources.find((r) => r.type === "PRESENTATION" && r.previewKind === "IMAGES");
  const n = pres?.pageCount ?? 0;
  const mid = Math.max(3, Math.ceil(n * 0.55));
  const task = lesson.resources.find((r) => r.type === "TASK");
  const map = lesson.games.find((g) => g.type === "MAP_POINT");
  const otherGame = lesson.games.find((g) => g.type !== "MAP_POINT");
  const quiz = lesson.quizzes[0];

  const s = (i: number, p: Omit<StageView, "id" | "description" | "resourceId" | "slideFrom" | "slideTo" | "quizId" | "gameId" | "activity"> & Partial<StageView>): StageView => ({
    id: `default-${i}`,
    description: null,
    activity: "NONE",
    resourceId: null,
    slideFrom: null,
    slideTo: null,
    quizId: null,
    gameId: null,
    ...p,
  });

  const stages: StageView[] = [
    s(1, { title: l.warmup, minutes: 5, ...(pres && n >= 2 ? { activity: "RESOURCE", resourceId: pres.id, slideFrom: 1, slideTo: 2 } : {}) }),
    s(2, { title: l.newTopic, minutes: 10, ...(pres && n > 2 ? { activity: "RESOURCE", resourceId: pres.id, slideFrom: 3, slideTo: mid } : {}) }),
    s(3, { title: l.presentation, minutes: 10, ...(pres && n > mid ? { activity: "RESOURCE", resourceId: pres.id, slideFrom: mid + 1, slideTo: n } : {}) }),
    s(4, { title: l.map, minutes: 5, ...(map ? { activity: "GAME", gameId: map.id } : {}) }),
    s(5, { title: l.group, minutes: 10, ...(task ? { activity: "RESOURCE", resourceId: task.id } : otherGame ? { activity: "GAME", gameId: otherGame.id } : {}) }),
    s(6, { title: l.check, minutes: 3, ...(quiz ? { activity: "QUIZ", quizId: quiz.id } : {}) }),
    s(7, { title: l.reflection, minutes: 2, description: l.reflectionText }),
  ];
  return stages;
}
