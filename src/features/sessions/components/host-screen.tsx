"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Crown, Eye, Flag, Loader2, Maximize, Play, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { HostState } from "../server/engine";
import { controlSessionAction } from "../actions";
import { GameItemPlayer, QuestionPlayer } from "@/features/games/components/players";
import type { PublicQuestion } from "@/features/quizzes/scoring";
import { useFullscreen } from "@/features/resources/components/slide-viewer";
import { cn } from "@/lib/utils";
import { countLabel } from "@/lib/format";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";

function usePoll<T>(url: string, ms: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      setData(await r.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, [url]);
  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const t = setInterval(refresh, ms);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [refresh, ms]);
  return { data, error, refresh };
}

export function HostScreen({ sessionId, joinUrl, backHref }: { sessionId: string; joinUrl: string; backHref: string }) {
  const t = useDict();
  const { data: s, error, refresh } = usePoll<HostState>(`/api/sessions/${sessionId}/state`, 1500);
  const [pending, start] = useTransition();
  const { ref, isFull, toggle } = useFullscreen<HTMLDivElement>();
  const autoRevealed = useRef<string | null>(null);

  const control = useCallback(
    (action: "start" | "reveal" | "next" | "finish") =>
      start(async () => {
        const res = await controlSessionAction(sessionId, action);
        if (!res.ok) toast.error(res.error);
        await refresh();
      }),
    [sessionId, refresh],
  );

  // Auto-reveal when time is up or everybody answered
  useEffect(() => {
    if (!s || s.status !== "ACTIVE" || s.revealed || !s.step) return;
    const everyone = s.participants.length > 0 && s.answers.total >= s.participants.length;
    if ((s.remaining === 0 || everyone) && autoRevealed.current !== s.step.id) {
      autoRevealed.current = s.step.id;
      control("reveal");
    }
  }, [s, control]);

  if (!s) {
    return (
      <div className="grid min-h-screen place-items-center">
        {error ? <p className="text-muted-foreground">{t.session.loadFailed}</p> : <Loader2 className="size-8 animate-spin text-muted-foreground" />}
      </div>
    );
  }

  const top = s.leaderboard.players.slice(0, 5);

  return (
    <div ref={ref} className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center gap-4 border-b px-4 sm:px-8">
        <Link href={backHref} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium hover:bg-muted">
          <ArrowLeft className="size-4" /> {t.session.back}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading font-medium">{s.title ?? (s.kind === "QUIZ" ? t.session.quizFallback : t.session.gameFallback)}</p>
          <p className="truncate text-xs text-muted-foreground">{fmt(t.session.lessonLine, { n: s.lesson.lessonNumber, title: s.lesson.title })}</p>
        </div>
        <span className="hidden rounded-xl bg-muted px-3 py-1.5 font-mono text-sm sm:block">PIN {s.pin}</span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="size-4" /> {s.participants.length}</span>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={isFull ? t.viewer.exitFullscreen : t.viewer.fullscreen}><Maximize /></Button>
      </header>

      {s.status === "LOBBY" && (
        <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 py-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <p className="text-lg text-muted-foreground">{t.session.openOnPhone}</p>
            <p className="font-heading text-3xl font-semibold break-all sm:text-4xl">{joinUrl}</p>
            <div>
              <p className="text-lg text-muted-foreground">{t.session.enterPin}</p>
              <p className="font-heading text-7xl font-bold tracking-[0.15em] text-steppe tabular-nums sm:text-8xl" aria-label={`PIN ${s.pin.split("").join(" ")}`}>
                {s.pin.slice(0, 3)} {s.pin.slice(3)}
              </p>
            </div>
            {s.teamMode && <p className="inline-flex rounded-full bg-gold-soft px-4 py-1.5 text-sm font-medium">{t.session.teamModeBadge}</p>}
            <Button size="xl" onClick={() => control("start")} disabled={pending || s.participants.length === 0}>
              {pending ? <Loader2 className="animate-spin" /> : <Play />} {fmt(t.session.start, { n: countLabel(s.total, s.kind === "QUIZ" ? t.session.questions : t.session.items) })}
            </Button>
            {s.participants.length === 0 && <p className="text-sm text-muted-foreground">{t.session.startHint}</p>}
          </div>
          <div className="space-y-6">
            <div className="mx-auto w-full max-w-xs rounded-3xl border bg-white p-4 shadow-lift">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/sessions/${s.id}/qr`} alt={fmt(t.session.qrAlt, { pin: s.pin })} className="w-full" />
            </div>
            <ParticipantCloud participants={s.participants} teamMode={s.teamMode} />
          </div>
        </main>
      )}

      {s.status === "ACTIVE" && s.step && (
        <main className="mx-auto grid w-full max-w-[1500px] flex-1 gap-8 px-6 py-8 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="rounded-full bg-muted px-4 py-1.5 text-sm font-medium tabular-nums">{s.index + 1} / {s.total}</span>
              <span className={cn("rounded-full px-4 py-1.5 font-heading text-lg font-semibold tabular-nums", s.remaining !== null && s.remaining <= 5 ? "bg-clay text-white" : "bg-steppe-soft text-steppe")}>
                {s.revealed ? t.session.timeUp : fmt(t.session.seconds, { n: s.remaining ?? 0 })}
              </span>
              <span className="text-muted-foreground">{fmt(t.session.answered, { a: s.answers.total, n: s.participants.length })}</span>
              {s.revealed && <span className="text-success">{fmt(t.session.correctCount, { n: s.answers.correct })}</span>}
            </div>
            <div key={s.step.id + String(s.revealed)}>
              {s.step.kind === "question" ? (
                <QuestionPlayer data={s.step.public as PublicQuestion} disabled reveal={s.step.reveal ? { ...s.step.reveal, correct: null } : null} large />
              ) : (
                <GameItemPlayer type={s.step.gameType!} data={s.step.public} disabled reveal={s.step.reveal ? { ...s.step.reveal, correct: null } : null} large />
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              {!s.revealed && (
                <Button size="xl" variant="outline" onClick={() => control("reveal")} disabled={pending}><Eye /> {t.session.revealAnswer}</Button>
              )}
              {s.revealed && (
                <Button size="xl" onClick={() => control("next")} disabled={pending}>
                  {s.index + 1 < s.total ? <>{t.session.nextQuestion} <ArrowRight /></> : <>{t.session.results} <Flag /></>}
                </Button>
              )}
            </div>
          </div>
          <aside className="space-y-4">
            {s.teamMode && <TeamScore teams={s.leaderboard.teams} />}
            <Leaderboard players={top} compact />
            <Button variant="ghost" className="w-full" onClick={() => control("finish")} disabled={pending}>{t.session.finishGame}</Button>
          </aside>
        </main>
      )}

      {s.status === "FINISHED" && (
        <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-6 py-12">
          <h1 className="text-center text-5xl font-semibold">{t.session.results}</h1>
          {s.teamMode && <TeamScore teams={s.leaderboard.teams} big />}
          <Podium players={s.leaderboard.players.slice(0, 3)} />
          <Leaderboard players={s.leaderboard.players} />
          <div className="flex justify-center">
            <Button asChild size="xl"><Link href={backHref}><ArrowLeft /> {t.session.backToLesson}</Link></Button>
          </div>
        </main>
      )}
    </div>
  );
}

function ParticipantCloud({ participants, teamMode }: { participants: HostState["participants"]; teamMode: boolean }) {
  const t = useDict();
  if (!participants.length) return <p className="text-center text-muted-foreground">{t.session.waitingPlayers}</p>;
  return (
    <div className="flex max-h-72 flex-wrap justify-center gap-2 overflow-y-auto" aria-live="polite">
      {participants.map((p) => (
        <span
          key={p.id}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium animate-fade-up",
            !teamMode && "bg-card shadow-soft",
            teamMode && p.team === "A" && "bg-steppe text-white",
            teamMode && p.team === "B" && "bg-clay text-white",
          )}
        >
          {p.name}
        </span>
      ))}
    </div>
  );
}

function TeamScore({ teams, big }: { teams: { A: number; B: number }; big?: boolean }) {
  const d = useDict();
  const lead = teams.A === teams.B ? null : teams.A > teams.B ? "A" : "B";
  return (
    <div className={cn("grid grid-cols-2 overflow-hidden rounded-2xl text-white shadow-lift", big && "text-center")}>
      {(["A", "B"] as const).map((t) => (
        <div key={t} className={cn("p-4", t === "A" ? "bg-steppe" : "bg-clay")}>
          <p className="flex items-center gap-1.5 text-sm text-white/80">{lead === t && <Crown className="size-4 text-gold" />} {fmt(d.session.teamN, { t })}</p>
          <p className={cn("font-heading font-bold tabular-nums", big ? "text-5xl" : "text-3xl")}>{teams[t]} XP</p>
        </div>
      ))}
    </div>
  );
}

export function Leaderboard({ players, compact }: { players: HostState["leaderboard"]["players"]; compact?: boolean }) {
  if (!players.length) return null;
  return (
    <ol className="divide-y overflow-hidden rounded-2xl border bg-card shadow-soft">
      {players.map((p) => (
        <li key={p.id} className={cn("flex items-center gap-3 px-4", compact ? "py-2.5" : "py-3.5")}>
          <span className={cn("grid size-8 place-items-center rounded-lg text-sm font-semibold tabular-nums", p.rank === 1 ? "bg-gold text-white" : "bg-muted")}>{p.rank}</span>
          <span className="flex-1 truncate font-medium">{p.name}</span>
          {p.team && <span className={cn("rounded-md px-1.5 text-xs text-white", p.team === "A" ? "bg-steppe" : "bg-clay")}>{p.team}</span>}
          <span className="font-heading font-semibold tabular-nums">{p.score}</span>
        </li>
      ))}
    </ol>
  );
}

function Podium({ players }: { players: HostState["leaderboard"]["players"] }) {
  if (!players.length) return null;
  const order = [players[1], players[0], players[2]].filter(Boolean);
  const heights: Record<number, string> = { 1: "h-44", 2: "h-32", 3: "h-24" };
  return (
    <div className="flex items-end justify-center gap-4">
      {order.map((p) => (
        <div key={p.id} className="flex w-40 flex-col items-center gap-2 animate-fade-up">
          {p.rank === 1 && <Crown className="size-8 text-gold" />}
          <p className="w-full truncate text-center font-heading text-lg font-semibold">{p.name}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{p.score} XP</p>
          <div className={cn("grid w-full place-items-center rounded-t-2xl font-heading text-4xl font-bold text-white", heights[p.rank], p.rank === 1 ? "bg-gold" : p.rank === 2 ? "bg-steppe" : "bg-clay")}>{p.rank}</div>
        </div>
      ))}
    </div>
  );
}
