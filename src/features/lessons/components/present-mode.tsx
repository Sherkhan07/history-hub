"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Gamepad2, ListChecks, Maximize, Minimize, PanelLeftClose, PanelLeftOpen, Pause, Play, Power, X,
} from "lucide-react";
import { toast } from "sonner";
import type { GameType, PreviewKind, ResourceType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { SlideViewer, useFullscreen } from "@/features/resources/components/slide-viewer";
import { ResourcePreview } from "@/features/resources/components/resource-preview";
import { TasksView } from "@/features/resources/components/tasks-view";
import { CardsView } from "@/features/resources/components/cards-view";
import { parseCards, parseHomework, parseTasks } from "@/features/resources/content";
import { GameRunner, QuizRunner } from "@/features/games/components/activity-runner";
import type { ScorableQuestion } from "@/features/quizzes/scoring";
import { fileUrl } from "@/lib/files";
import { formatClock } from "@/lib/format";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";
import { countLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StageView } from "../stages";

export type PresentLesson = {
  id: string;
  title: string;
  lessonNumber: number;
  durationMinutes: number;
  researchQuestion: string | null;
  resources: { id: string; type: ResourceType; title: string; previewKind: PreviewKind; previewPages: string[]; fileUrl: string | null; externalUrl: string | null; content: unknown }[];
  quizzes: { id: string; title: string; questions: ScorableQuestion[] }[];
  games: { id: string; type: GameType; title: string; instructions: string | null; items: { id: string; points: number; data: unknown }[] }[];
};

function useTicker(running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [running]);
  return now;
}

export function PresentMode({ lesson, stages, isDefaultPlan, initialStage = 0 }: { lesson: PresentLesson; stages: StageView[]; isDefaultPlan: boolean; initialStage?: number }) {
  const t = useDict();
  const router = useRouter();
  const { ref, isFull, toggle } = useFullscreen<HTMLDivElement>();
  const [stageIdx, setStageIdx] = useState(Math.min(initialStage, stages.length - 1));
  const [rail, setRail] = useState(true);
  const [overlay, setOverlay] = useState<null | { kind: "quiz" | "game"; id: string }>(null);

  // Timers survive reloads (sessionStorage) and can be paused
  const storeKey = `hh-present-${lesson.id}`;
  const [clock, setClock] = useState<{ startedAt: number; pausedAt: number | null; pausedTotal: number }>(() => ({ startedAt: Date.now(), pausedAt: null, pausedTotal: 0 }));
  const [stageStartedAt, setStageStartedAt] = useState(() => Date.now());
  useEffect(() => {
    // Restore a running lesson clock after reload (deferred to keep the first render hydration-safe)
    const id = setTimeout(() => {
      try {
        const saved = sessionStorage.getItem(storeKey);
        if (saved) setClock(JSON.parse(saved));
      } catch {
        /* storage unavailable */
      }
    }, 0);
    return () => clearTimeout(id);
  }, [storeKey]);
  useEffect(() => {
    try {
      sessionStorage.setItem(storeKey, JSON.stringify(clock));
    } catch {
      /* ignore */
    }
  }, [clock, storeKey]);

  const running = clock.pausedAt === null;
  const now = useTicker(running);
  const elapsed = Math.floor(((clock.pausedAt ?? now) - clock.startedAt - clock.pausedTotal) / 1000);
  const total = lesson.durationMinutes * 60;
  const stage = stages[stageIdx];
  const stageElapsed = Math.floor(((clock.pausedAt ?? now) - stageStartedAt) / 1000);
  const stageLeft = stage.minutes * 60 - stageElapsed;

  const resource = stage.resourceId ? lesson.resources.find((r) => r.id === stage.resourceId) : undefined;
  const quiz = stage.quizId ? lesson.quizzes.find((q) => q.id === stage.quizId) : undefined;
  const game = stage.gameId ? lesson.games.find((g) => g.id === stage.gameId) : undefined;
  const slides = useMemo(() => (resource?.previewKind === "IMAGES" ? resource.previewPages.map((k) => fileUrl(k)!) : []), [resource]);
  const range = useMemo<[number, number] | undefined>(
    () => (slides.length ? [stage.slideFrom ?? 1, stage.slideTo ?? slides.length] : undefined),
    [slides.length, stage.slideFrom, stage.slideTo],
  );
  const [slide, setSlide] = useState(range ? range[0] - 1 : 0);

  const goStage = useCallback(
    (i: number, atEnd = false) => {
      if (i < 0 || i >= stages.length) return;
      setStageIdx(i);
      setStageStartedAt(Date.now());
      setOverlay(null);
      const s = stages[i];
      const r = s.resourceId ? lesson.resources.find((x) => x.id === s.resourceId) : undefined;
      const count = r?.previewKind === "IMAGES" ? r.previewPages.length : 0;
      if (count) setSlide(atEnd ? (s.slideTo ?? count) - 1 : (s.slideFrom ?? 1) - 1);
    },
    [stages, lesson.resources],
  );

  // Clicker-friendly: → advances slides, then rolls over into the next stage
  const next = useCallback(() => {
    if (range && slide < range[1] - 1) setSlide(slide + 1);
    else goStage(stageIdx + 1);
  }, [range, slide, stageIdx, goStage]);
  const prev = useCallback(() => {
    if (range && slide > range[0] - 1) setSlide(slide - 1);
    else goStage(stageIdx - 1, true);
  }, [range, slide, stageIdx, goStage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (overlay) {
        if (e.key === "Escape") setOverlay(null);
        return;
      }
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag) && e.key === " ") return;
      if (["ArrowRight", "PageDown"].includes(e.key) || (e.key === " " && tag !== "BUTTON")) {
        e.preventDefault();
        next();
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        prev();
      } else if (e.key.toLowerCase() === "f") toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, toggle, overlay]);

  const togglePause = () =>
    setClock((c) => (c.pausedAt === null ? { ...c, pausedAt: Date.now() } : { ...c, pausedTotal: c.pausedTotal + (Date.now() - c.pausedAt), pausedAt: null }));

  const finish = () => {
    try {
      sessionStorage.removeItem(storeKey);
    } catch {
      /* ignore */
    }
    if (document.fullscreenElement) void document.exitFullscreen();
    toast.success(t.present.finished);
    router.push(`/teacher/lesson/${lesson.id}`);
  };

  return (
    <div ref={ref} className="stage-dark flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Top bar */}
      <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
        <button type="button" onClick={() => setRail((r) => !r)} className="grid size-10 place-items-center rounded-xl hover:bg-accent" aria-label={rail ? t.present.hideStages : t.present.showStages}>
          {rail ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading font-medium">{lesson.lessonNumber}. {lesson.title}</p>
          <p className="text-xs text-muted-foreground">{fmt(t.present.stageOf, { n: stageIdx + 1, total: stages.length })}</p>
        </div>
        <div className="hidden items-center gap-5 md:flex" aria-live="off">
          <div className="text-right">
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{t.present.lessonTime}</p>
            <p className={cn("font-heading text-xl font-semibold tabular-nums", elapsed > total && "text-clay")}>
              {formatClock(elapsed)} <span className="text-sm font-normal text-muted-foreground">/ {formatClock(total)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{t.present.stageTime}</p>
            <p className={cn("font-heading text-xl font-semibold tabular-nums", stageLeft < 60 && stageLeft >= 0 && "text-gold", stageLeft < 0 && "text-clay")}>{formatClock(stageLeft)}</p>
          </div>
          <button type="button" onClick={togglePause} className="grid size-10 place-items-center rounded-xl hover:bg-accent" aria-label={running ? t.present.pause : t.present.resume}>
            {running ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
        </div>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={isFull ? t.present.exitFullscreen : t.present.fullscreen}>
          {isFull ? <Minimize /> : <Maximize />}
        </Button>
        <Button variant="secondary" onClick={finish}>
          <Power /> <span className="hidden sm:inline">{t.present.finish}</span>
        </Button>
      </header>
      <div className="h-1 shrink-0 bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (elapsed / total) * 100)}%` }} />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Stage rail */}
        {rail && (
          <nav className="hidden w-72 shrink-0 overflow-y-auto border-r p-3 lg:block" aria-label={t.present.stages}>
            {isDefaultPlan && <p className="mb-3 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">{t.present.noStages}</p>}
            <ol className="space-y-1">
              {stages.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goStage(i)}
                    aria-current={i === stageIdx ? "step" : undefined}
                    className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", i === stageIdx ? "bg-primary text-primary-foreground" : i < stageIdx ? "text-muted-foreground hover:bg-accent" : "hover:bg-accent")}
                  >
                    <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold", i === stageIdx ? "bg-primary-foreground/20" : "bg-secondary")}>{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug font-medium">{s.title}</span>
                      <span className={cn("text-xs", i === stageIdx ? "text-primary-foreground/75" : "text-muted-foreground")}>{fmt(t.common.min, { n: s.minutes })}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Stage content */}
        <main className="flex min-w-0 flex-1 flex-col p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="text-2xl font-semibold sm:text-3xl">{stage.title}</h1>
            <span className="text-muted-foreground">{fmt(t.present.minutes, { n: stage.minutes })}</span>
            {stage.description && <p className="w-full text-lg text-muted-foreground">{stage.description}</p>}
          </div>

          <div className="min-h-0 flex-1">
            {slides.length > 0 && range ? (
              <SlideViewer pages={slides} title={resource!.title} range={range} index={slide} onIndexChange={setSlide} captureKeys={false} showThumbnails={false} fill />
            ) : resource ? (
              <StageResource resource={resource} />
            ) : quiz ? (
              <ActivityCard
                icon={<ListChecks className="size-8" />}
                kicker={fmt(t.present.quizKicker, { n: countLabel(quiz.questions.length, t.catalog.questions) })}
                title={quiz.title}
                onPlay={() => setOverlay({ kind: "quiz", id: quiz.id })}
              />
            ) : game ? (
              <ActivityCard
                icon={<Gamepad2 className="size-8" />}
                kicker={t.gameTypes[game.type]}
                title={game.title}
                description={game.instructions}
                onPlay={() => setOverlay({ kind: "game", id: game.id })}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-6 rounded-3xl border border-dashed text-center">
                {lesson.researchQuestion && stageIdx === stages.length - 1 ? (
                  <>
                    <p className="text-sm tracking-widest text-primary uppercase">{t.present.backToRq}</p>
                    <p className="max-w-4xl font-heading text-4xl leading-tight font-semibold text-balance">{lesson.researchQuestion}</p>
                  </>
                ) : (
                  <p className="max-w-3xl font-heading text-4xl font-semibold text-balance">{stage.title}</p>
                )}
              </div>
            )}
          </div>

          <footer className="mt-4 flex shrink-0 items-center justify-between gap-3">
            <Button variant="secondary" size="xl" onClick={prev} disabled={stageIdx === 0 && (!range || slide <= range[0] - 1)}>
              <ChevronLeft /> {t.common.back}
            </Button>
            {range && <p className="text-sm text-muted-foreground tabular-nums">{fmt(t.present.slide, { n: slide + 1, total: slides.length })}</p>}
            {stageIdx < stages.length - 1 || (range && slide < range[1] - 1) ? (
              <Button size="xl" onClick={next}>
                {t.common.next} <ChevronRight />
              </Button>
            ) : (
              <Button size="xl" onClick={finish}>
                <Power /> {t.present.finish}
              </Button>
            )}
          </footer>
        </main>
      </div>

      {overlay && (
        <div className="stage-light fixed inset-0 z-50 overflow-y-auto bg-background text-foreground" role="dialog" aria-modal="true">
          <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur">
            <p className="font-heading font-medium">{overlay.kind === "quiz" ? quiz?.title : game?.title}</p>
            <Button variant="ghost" onClick={() => setOverlay(null)}><X /> {t.present.backToLesson}</Button>
          </div>
          <div className="mx-auto max-w-5xl px-6 py-8">
            {overlay.kind === "quiz" && quiz && <QuizRunner title={quiz.title} questions={quiz.questions} onExit={() => setOverlay(null)} />}
            {overlay.kind === "game" && game && <GameRunner game={game} onExit={() => setOverlay(null)} />}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityCard({ icon, kicker, title, description, onPlay }: { icon: React.ReactNode; kicker: string; title: string; description?: string | null; onPlay: () => void }) {
  const t = useDict();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 rounded-3xl border bg-card p-10 text-center">
      <span className="grid size-20 place-items-center rounded-3xl bg-primary/15 text-primary">{icon}</span>
      <div>
        <p className="text-muted-foreground">{kicker}</p>
        <p className="mt-1 max-w-3xl font-heading text-4xl font-semibold text-balance">{title}</p>
        {description && <p className="mt-3 text-lg text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="xl" onClick={onPlay}><Play /> {t.present.openOnBoard}</Button>
      </div>
    </div>
  );
}

function StageResource({ resource }: { resource: PresentLesson["resources"][number] }) {
  const tasks = resource.type === "TASK" ? parseTasks(resource.content) : [];
  const cards = resource.type === "CARDS" ? parseCards(resource.content) : [];
  const hw = resource.type === "HOMEWORK" ? parseHomework(resource.content) : null;
  return (
    <div className="stage-light h-full overflow-y-auto rounded-3xl bg-background p-6 text-foreground">
      {tasks.length ? (
        <TasksView tasks={tasks} large />
      ) : cards.length ? (
        <CardsView cards={cards} />
      ) : hw ? (
        <p className="p-6 font-heading text-3xl leading-relaxed">{hw}</p>
      ) : (
        <ResourcePreview resource={resource} captureKeys={false} />
      )}
    </div>
  );
}
