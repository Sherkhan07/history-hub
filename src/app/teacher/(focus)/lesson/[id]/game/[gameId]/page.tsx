import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadViewableLesson } from "@/features/lessons/server/access";
import { FocusBar } from "@/components/layout/focus-bar";
import { LocalGame } from "@/features/quizzes/components/local-players";
import { getDictionary } from "@/i18n";
import { fmt } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).lesson.gameTitle };
}

export default async function GamePage({ params }: PageProps<"/teacher/lesson/[id]/game/[gameId]">) {
  const { id, gameId } = await params;
  const [{ lesson }, t] = await Promise.all([loadViewableLesson(id), getDictionary()]);
  const game = lesson.games.find((g) => g.id === gameId);
  if (!game) notFound();
  return (
    <>
      <FocusBar
        backHref={`/teacher/lesson/${lesson.id}`}
        title={game.title}
        backLabel={t.lesson.toLesson}
        subtitle={`${t.gameTypes[game.type]} · ${fmt(t.lesson.lessonCrumb, { n: lesson.lessonNumber, title: lesson.title })}`}
             />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        {game.instructions && <p className="mb-6 text-muted-foreground">{game.instructions}</p>}
        <LocalGame game={{ id: game.id, type: game.type, title: game.title, items: game.items }} backHref={`/teacher/lesson/${lesson.id}`} />
      </main>
    </>
  );
}
