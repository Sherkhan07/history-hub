import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadViewableLesson } from "@/features/lessons/server/access";
import { FocusBar } from "@/components/layout/focus-bar";
import { LocalQuiz } from "@/features/quizzes/components/local-players";
import { LaunchForClassButton } from "@/features/sessions/components/launch-button";
import { getDictionary } from "@/i18n";
import { fmt } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).lesson.quiz };
}

export default async function QuizPage({ params }: PageProps<"/teacher/lesson/[id]/quiz/[quizId]">) {
  const { id, quizId } = await params;
  const [{ lesson }, t] = await Promise.all([loadViewableLesson(id), getDictionary()]);
  const quiz = lesson.quizzes.find((q) => q.id === quizId);
  if (!quiz) notFound();
  return (
    <>
      <FocusBar
        backHref={`/teacher/lesson/${lesson.id}`}
        title={quiz.title}
        backLabel={t.lesson.toLesson}
        subtitle={fmt(t.lesson.lessonCrumb, { n: lesson.lessonNumber, title: lesson.title })}
        actions={<LaunchForClassButton lessonId={lesson.id} quizId={quiz.id} title={quiz.title} variant="outline" />}
      />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <LocalQuiz title={quiz.title} questions={quiz.questions} backHref={`/teacher/lesson/${lesson.id}`} />
      </main>
    </>
  );
}
