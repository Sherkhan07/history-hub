"use client";

import { useMemo, useState } from "react";
import { ArrowRight, RotateCcw, Trophy } from "lucide-react";
import type { GameType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { gameLabels, getDefinition } from "../definitions";
import { revealForGameItem, revealForQuestion } from "../reveal";
import { scoreQuestion, toPublicQuestion, type ScorableQuestion } from "@/features/quizzes/scoring";
import { GameItemPlayer, QuestionPlayer, type Reveal } from "./players";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";

type Step = {
  id: string;
  render: (args: { onSubmit: (a: unknown) => void; reveal: Reveal | null }) => React.ReactNode;
  check: (a: unknown) => { correct: boolean; ratio: number };
  reveal: () => Reveal;
  points: number;
};

/** Local (single-screen) runner: the teacher plays a quiz or game with the class on the board. */
function Runner({ title, steps, onExit }: { title: string; steps: Step[]; onExit?: () => void }) {
  const t = useDict();
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [score, setScore] = useState({ points: 0, correct: 0 });
  const done = index >= steps.length;

  if (!steps.length) return <p className="text-muted-foreground">{t.play.noItems}</p>;

  if (done) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-16 text-center animate-fade-up">
        <span className="grid size-20 place-items-center rounded-full bg-gold-soft text-[oklch(0.55_0.1_70)]"><Trophy className="size-10" /></span>
        <h2 className="text-4xl font-semibold">{t.play.done}</h2>
        <p className="text-xl text-muted-foreground">
          {fmt(t.play.result, { c: score.correct, n: steps.length, xp: score.points })}
        </p>
        <div className="flex gap-3">
          <Button size="lg" variant="outline" onClick={() => { setIndex(0); setReveal(null); setScore({ points: 0, correct: 0 }); }}>
            <RotateCcw /> {t.play.again}
          </Button>
          {onExit && <Button size="lg" onClick={onExit}>{t.play.finish}</Button>}
        </div>
      </div>
    );
  }

  const step = steps[index];
  const submit = (a: unknown) => {
    if (reveal) return;
    const r = step.check(a);
    setScore((s) => ({ points: s.points + Math.round(step.points * r.ratio), correct: s.correct + (r.correct ? 1 : 0) }));
    setReveal({ ...step.reveal(), correct: r.correct });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <p className="shrink-0 text-sm text-muted-foreground tabular-nums">{index + 1} / {steps.length}</p>
        <Progress value={((index + (reveal ? 1 : 0)) / steps.length) * 100} className="h-2" aria-label={title} />
        <p className="shrink-0 rounded-full bg-gold-soft px-3 py-1 text-sm font-medium tabular-nums">{score.points} XP</p>
      </div>
      <div key={step.id} className="animate-fade-up">{step.render({ onSubmit: submit, reveal })}</div>
      <div className="flex justify-end gap-3">
        {!reveal && (
          <Button variant="ghost" onClick={() => setReveal({ ...step.reveal(), correct: null })}>{t.play.showAnswer}</Button>
        )}
        {reveal && (
          <Button size="xl" onClick={() => { setIndex((i) => i + 1); setReveal(null); }}>
            {index + 1 < steps.length ? t.play.nextItem : t.play.results} <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}

export function QuizRunner({ title, questions, onExit }: { title: string; questions: ScorableQuestion[]; onExit?: () => void }) {
  const steps = useMemo<Step[]>(
    () =>
      questions.map((q) => ({
        id: q.id,
        points: q.points,
        render: ({ onSubmit, reveal }) => <QuestionPlayer data={toPublicQuestion(q)} onSubmit={onSubmit} reveal={reveal} large />,
        check: (a) => scoreQuestion(q, a),
        reveal: () => revealForQuestion(q),
      })),
    [questions],
  );
  return <Runner title={title} steps={steps} onExit={onExit} />;
}

export type RunnableGame = { id: string; type: GameType; title: string; items: { id: string; points: number; data: unknown }[] };

export function GameRunner({ game, onExit }: { game: RunnableGame; onExit?: () => void }) {
  const t = useDict();
  const steps = useMemo<Step[]>(() => {
    const def = getDefinition(game.type);
    return game.items.flatMap((item) => {
      const parsed = def.item.safeParse(item.data);
      if (!parsed.success) return [];
      const pub = def.toPublic(parsed.data, item.id);
      return [
        {
          id: item.id,
          points: item.points,
          render: ({ onSubmit, reveal }) => <GameItemPlayer type={game.type} data={pub} onSubmit={onSubmit} reveal={reveal} large />,
          check: (a: unknown) => {
            const ans = def.answer.safeParse(a);
            return ans.success ? def.check(parsed.data, ans.data) : { correct: false, ratio: 0 };
          },
          reveal: () => revealForGameItem(game.type, item.data, gameLabels(t)) ?? { solution: def.solution(parsed.data, gameLabels(t)) },
        },
      ];
    });
  }, [game, t]);
  return <Runner title={game.title} steps={steps} onExit={onExit} />;
}
