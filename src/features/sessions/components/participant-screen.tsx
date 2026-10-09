"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Crown, Hourglass, Loader2, Trophy, XCircle } from "lucide-react";
import type { GameType } from "@/generated/prisma/enums";
import { GameItemPlayer, QuestionPlayer, type Reveal } from "@/features/games/components/players";
import type { PublicQuestion } from "@/features/quizzes/scoring";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";

type State =
  | { found: false }
  | { found: true; joined: false; status: string }
  | {
      found: true;
      joined: true;
      status: "LOBBY" | "ACTIVE" | "FINISHED";
      title: string | null;
      teamMode: boolean;
      me: { name: string; team: string | null; score: number; rank: number | null };
      index: number;
      total: number;
      revealed: boolean;
      remaining: number | null;
      step: { id: string; kind: "question" | "game"; gameType: GameType | null; points: number; public: unknown } | null;
      myAnswer: { isCorrect: boolean | null; points: number | null } | null;
      reveal: Reveal | null;
      teams: { A: number; B: number } | null;
      top: { id: string; name: string; score: number; rank: number; team: string | null }[] | null;
    };

export function ParticipantScreen({ pin }: { pin: string }) {
  const t = useDict();
  const router = useRouter();
  const [s, setS] = useState<State | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`/api/play/${pin}/state`, { cache: "no-store" });
      setS(await r.json());
    } catch {
      /* transient network error — next poll retries */
    }
  }, [pin]);

  useEffect(() => {
    const first = setTimeout(poll, 0);
    const t = setInterval(poll, 1500);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [poll]);

  useEffect(() => {
    if (s && s.found && !s.joined) router.replace(`/join?pin=${pin}`);
  }, [s, pin, router]);

  const submit = async (itemId: string, answer: unknown) => {
    setSending(itemId);
    try {
      const r = await fetch(`/api/play/${pin}/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, answer }) });
      if (r.ok || r.status === 409) setSent((x) => ({ ...x, [itemId]: true }));
      await poll();
    } finally {
      setSending(null);
    }
  };

  if (!s) return <Center><Loader2 className="size-8 animate-spin text-muted-foreground" /></Center>;
  if (!s.found) return <Center><p className="text-lg">{t.session.notFound}</p></Center>;
  if (!s.joined) return <Center><Loader2 className="size-8 animate-spin" /></Center>;

  const teamTone = s.me.team === "A" ? "bg-steppe" : s.me.team === "B" ? "bg-clay" : "bg-ink";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className={cn("flex items-center gap-3 px-4 py-3 text-white", teamTone)}>
        <LogoMark className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{s.me.name}{s.me.team && fmt(t.session.team, { t: s.me.team })}</p>
          <p className="truncate text-xs text-white/75">{s.title ?? t.session.quizFallback}</p>
        </div>
        <span className="rounded-full bg-white/20 px-3 py-1 font-heading font-semibold tabular-nums">{s.me.score} XP</span>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {s.status === "LOBBY" && (
          <Center>
            <Hourglass className="size-12 animate-pulse text-steppe" />
            <p className="font-heading text-2xl font-semibold">{t.session.joined}</p>
            <p className="text-muted-foreground">{t.session.waiting}</p>
          </Center>
        )}

        {s.status === "ACTIVE" && s.step && (
          <div className="space-y-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="tabular-nums">{s.index + 1} / {s.total}</span>
              {!s.revealed && s.remaining !== null && <span className={cn("rounded-full px-3 py-1 font-semibold tabular-nums", s.remaining <= 5 ? "bg-clay text-white" : "bg-muted")}>{fmt(t.session.seconds, { n: s.remaining })}</span>}
            </div>
            {s.myAnswer || sent[s.step.id] ? (
              s.revealed ? (
                <ResultCard correct={Boolean(s.myAnswer?.isCorrect)} points={s.myAnswer?.points ?? 0} solution={s.reveal?.solution ?? null} />
              ) : (
                <Center><CheckCircle2 className="size-12 text-success" /><p className="font-heading text-2xl font-semibold">{t.session.answerSent}</p><p className="text-muted-foreground">{t.session.waitOthers}</p></Center>
              )
            ) : s.revealed ? (
              <ResultCard correct={false} points={0} solution={s.reveal?.solution ?? null} missed />
            ) : (
              <div key={s.step.id} className={cn(sending && "pointer-events-none opacity-60")}>
                {s.step.kind === "question" ? (
                  <QuestionPlayer data={s.step.public as PublicQuestion} onSubmit={(a) => submit(s.step!.id, a)} />
                ) : (
                  <GameItemPlayer type={s.step.gameType!} data={s.step.public} onSubmit={(a) => submit(s.step!.id, a)} />
                )}
              </div>
            )}
          </div>
        )}

        {s.status === "FINISHED" && (
          <Center>
            <Trophy className="size-14 text-gold" />
            <p className="font-heading text-3xl font-semibold">{t.session.finished}</p>
            <p className="text-lg">{fmt(t.session.yourPlace, { r: s.me.rank ?? "—", xp: s.me.score })}</p>
            {s.teams && (
              <p className="text-muted-foreground">
                {fmt(t.session.teamsScore, { a: s.teams.A, b: s.teams.B })}
              </p>
            )}
            {s.top && (
              <ol className="mt-4 w-full max-w-sm divide-y rounded-2xl border bg-card text-left">
                {s.top.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-6 font-semibold tabular-nums">{p.rank}</span>
                    {p.rank === 1 && <Crown className="size-4 text-gold" />}
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="tabular-nums">{p.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </Center>
        )}
      </main>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">{children}</div>;
}

function ResultCard({ correct, points, solution, missed }: { correct: boolean; points: number; solution: string | null; missed?: boolean }) {
  const t = useDict();
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-3xl p-8 text-center text-white animate-fade-up", correct ? "bg-success" : "bg-clay")}>
      {correct ? <CheckCircle2 className="size-14" /> : <XCircle className="size-14" />}
      <p className="font-heading text-3xl font-semibold">{missed ? t.session.timeUp : correct ? t.play.correct : t.play.incorrect}</p>
      {points > 0 && <p className="text-xl">+{points} XP</p>}
      {solution && <p className="text-white/90">{fmt(t.play.answer, { a: solution })}</p>}
    </div>
  );
}
