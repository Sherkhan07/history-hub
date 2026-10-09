"use client";

import { useRouter } from "next/navigation";
import { GameRunner, QuizRunner, type RunnableGame } from "@/features/games/components/activity-runner";
import type { ScorableQuestion } from "../scoring";

export function LocalQuiz({ title, questions, backHref }: { title: string; questions: ScorableQuestion[]; backHref: string }) {
  const router = useRouter();
  return <QuizRunner title={title} questions={questions} onExit={() => router.push(backHref)} />;
}

export function LocalGame({ game, backHref }: { game: RunnableGame; backHref: string }) {
  const router = useRouter();
  return <GameRunner game={game} onExit={() => router.push(backHref)} />;
}
