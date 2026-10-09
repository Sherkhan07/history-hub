import "server-only";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import type { GameType } from "@/generated/prisma/enums";
import { gameLabels, getDefinition, scoreGameAnswer, toPublicGameItem, type GameLabels } from "@/features/games/definitions";
import { getDictionary } from "@/i18n";
import { revealForGameItem, revealForQuestion, type RevealData } from "@/features/games/reveal";
import { livePoints, questionSolution, scoreQuestion, toPublicQuestion, type ScorableQuestion } from "@/features/quizzes/scoring";
import { newToken, sha256 } from "@/server/auth/session";

/** A unified "step" of a live session — one quiz question or one game item. */
export type Step = {
  id: string;
  kind: "question" | "game";
  gameType?: GameType;
  points: number;
  seconds: number;
  /** Safe to send to students */
  public: unknown;
  solution: string;
  reveal: RevealData;
  score(answer: unknown): { correct: boolean; ratio: number };
};

type SessionRow = NonNullable<Awaited<ReturnType<typeof loadSession>>>;

async function loadSession(where: { id: string } | { pin: string }) {
  const include = {
    quiz: { include: { questions: { orderBy: { sortOrder: "asc" as const }, include: { options: { orderBy: { sortOrder: "asc" as const } } } } } },
    game: { include: { items: { orderBy: { sortOrder: "asc" as const } } } },
    lesson: { select: { id: true, title: true, lessonNumber: true } },
  };
  if ("id" in where) return db.gameSession.findUnique({ where: { id: where.id }, include });
  return db.gameSession.findFirst({ where: { pin: where.pin, status: { not: "FINISHED" } }, include, orderBy: { createdAt: "desc" } });
}

function buildSteps(s: SessionRow, labels: GameLabels): Step[] {
  if (s.kind === "QUIZ" && s.quiz) {
    const seconds = s.quiz.timePerQuestion;
    return s.quiz.questions.map((q) => {
      const sq: ScorableQuestion = q;
      return {
        id: q.id,
        kind: "question",
        points: q.points,
        seconds,
        public: toPublicQuestion(sq),
        solution: questionSolution(sq),
        reveal: revealForQuestion(sq),
        score: (a) => scoreQuestion(sq, a),
      };
    });
  }
  if (s.kind === "GAME" && s.game) {
    const type = s.game.type;
    const def = getDefinition(type);
    return s.game.items.flatMap((item) => {
      const parsed = def.item.safeParse(item.data);
      if (!parsed.success) return [];
      return [
        {
          id: item.id,
          kind: "game" as const,
          gameType: type,
          points: item.points,
          seconds: def.seconds,
          public: toPublicGameItem(type, item).data,
          solution: def.solution(parsed.data, labels),
          reveal: revealForGameItem(type, item.data, labels) ?? { solution: def.solution(parsed.data, labels) },
          score: (a: unknown) => scoreGameAnswer(type, item.data, a),
        },
      ];
    });
  }
  return [];
}

/** Domain errors whose message is a `msg` dictionary key — safe to show to the teacher. */
export class SessionError extends Error {}

export async function generatePin(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const pin = String(randomInt(100000, 1000000));
    const clash = await db.gameSession.findFirst({ where: { pin, status: { not: "FINISHED" } }, select: { id: true } });
    if (!clash) return pin;
  }
  throw new SessionError("pinFailed");
}

function leaderboard(participants: { id: string; displayName: string; score: number; team: string | null }[]) {
  const sorted = [...participants].sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));
  const teams = { A: 0, B: 0 };
  for (const p of participants) if (p.team === "A" || p.team === "B") teams[p.team] += p.score;
  return { players: sorted.map((p, i) => ({ id: p.id, name: p.displayName, score: p.score, team: p.team, rank: i + 1 })), teams };
}

function remainingSeconds(s: { stepStartedAt: Date | null; status: string; revealed: boolean }, step: Step | undefined) {
  if (!step || s.status !== "ACTIVE" || !s.stepStartedAt || s.revealed) return null;
  return Math.max(0, Math.ceil(step.seconds - (Date.now() - s.stepStartedAt.getTime()) / 1000));
}

// ───────────────────────── Host side ─────────────────────────

export async function getHostState(sessionId: string) {
  const s = await loadSession({ id: sessionId });
  if (!s) return null;
  const steps = buildSteps(s, gameLabels(await getDictionary()));
  const participants = await db.sessionParticipant.findMany({
    where: { sessionId },
    select: { id: true, displayName: true, score: true, team: true },
    orderBy: { joinedAt: "asc" },
  });
  const step = s.status === "ACTIVE" ? steps[s.currentIndex] : undefined;
  const answers = { total: 0, correct: 0 };
  if (step) {
    const rows = await db.sessionAnswer.groupBy({ by: ["isCorrect"], where: { sessionId, itemId: step.id }, _count: true });
    for (const r of rows) {
      answers.total += r._count;
      if (r.isCorrect) answers.correct += r._count;
    }
  }
  return {
    id: s.id,
    pin: s.pin,
    status: s.status,
    teamMode: s.teamMode,
    kind: s.kind,
    title: (s.kind === "QUIZ" ? s.quiz?.title : s.game?.title) ?? null,
    gameType: s.game?.type ?? null,
    lesson: s.lesson,
    teacherId: s.teacherId,
    index: s.currentIndex,
    total: steps.length,
    revealed: s.revealed,
    remaining: remainingSeconds(s, step),
    step: step
      ? { id: step.id, kind: step.kind, gameType: step.gameType ?? null, points: step.points, seconds: step.seconds, public: step.public, reveal: s.revealed ? step.reveal : null }
      : null,
    answers,
    participants: participants.map((p) => ({ id: p.id, name: p.displayName, team: p.team })),
    leaderboard: leaderboard(participants),
  };
}

export type HostState = NonNullable<Awaited<ReturnType<typeof getHostState>>>;

export async function advanceSession(sessionId: string, action: "start" | "reveal" | "next" | "finish") {
  const s = await loadSession({ id: sessionId });
  if (!s) throw new SessionError("sessionNotFound");
  const total = buildSteps(s, gameLabels(await getDictionary())).length;
  const now = new Date();
  switch (action) {
    case "start":
      if (s.status !== "LOBBY") return;
      if (!total) throw new SessionError("activityEmpty");
      await db.gameSession.update({ where: { id: s.id }, data: { status: "ACTIVE", startedAt: now, stepStartedAt: now, currentIndex: 0, revealed: false } });
      return;
    case "reveal":
      if (s.status !== "ACTIVE") return;
      await db.gameSession.update({ where: { id: s.id }, data: { revealed: true } });
      return;
    case "next":
      if (s.status !== "ACTIVE") return;
      if (s.currentIndex + 1 >= total) {
        await db.gameSession.update({ where: { id: s.id }, data: { status: "FINISHED", endedAt: now, revealed: true } });
      } else {
        await db.gameSession.update({ where: { id: s.id }, data: { currentIndex: s.currentIndex + 1, stepStartedAt: now, revealed: false } });
      }
      return;
    case "finish":
      await db.gameSession.update({ where: { id: s.id }, data: { status: "FINISHED", endedAt: now } });
      return;
  }
}

// ───────────────────────── Participant side ─────────────────────────

export class JoinError extends Error {}

export async function joinSession(pin: string, displayName: string) {
  const s = await db.gameSession.findFirst({ where: { pin, status: { not: "FINISHED" } }, orderBy: { createdAt: "desc" } });
  if (!s) throw new JoinError("pinNotFound");
  const name = displayName.trim().replace(/\s+/g, " ");
  const taken = await db.sessionParticipant.findFirst({ where: { sessionId: s.id, displayName: { equals: name, mode: "insensitive" } } });
  if (taken) throw new JoinError("nameTaken");
  const count = await db.sessionParticipant.count({ where: { sessionId: s.id } });
  if (count >= 200) throw new JoinError("sessionFull");

  let team: string | null = null;
  if (s.teamMode) {
    const [a, b] = await Promise.all([
      db.sessionParticipant.count({ where: { sessionId: s.id, team: "A" } }),
      db.sessionParticipant.count({ where: { sessionId: s.id, team: "B" } }),
    ]);
    team = a <= b ? "A" : "B";
  }
  const token = newToken();
  const p = await db.sessionParticipant.create({ data: { sessionId: s.id, displayName: name, team, tokenHash: sha256(token) } });
  return { sessionId: s.id, participantId: p.id, token, pin: s.pin };
}

async function findParticipant(sessionId: string, token: string | undefined) {
  if (!token) return null;
  const p = await db.sessionParticipant.findUnique({ where: { tokenHash: sha256(token) } });
  return p && p.sessionId === sessionId ? p : null;
}

export async function getParticipantState(pin: string, token: string | undefined) {
  const s = await db.gameSession.findFirst({
    where: { pin },
    orderBy: { createdAt: "desc" },
    include: {
      quiz: { include: { questions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } } } },
      game: { include: { items: { orderBy: { sortOrder: "asc" } } } },
      lesson: { select: { id: true, title: true, lessonNumber: true } },
    },
  });
  if (!s) return { found: false as const };
  const me = await findParticipant(s.id, token);
  if (!me) return { found: true as const, joined: false as const, status: s.status };

  const steps = buildSteps(s, gameLabels(await getDictionary()));
  const step = s.status === "ACTIVE" ? steps[s.currentIndex] : undefined;
  const mine = step ? await db.sessionAnswer.findUnique({ where: { participantId_itemId: { participantId: me.id, itemId: step.id } } }) : null;
  const participants = await db.sessionParticipant.findMany({ where: { sessionId: s.id }, select: { id: true, displayName: true, score: true, team: true } });
  const board = leaderboard(participants);

  return {
    found: true as const,
    joined: true as const,
    status: s.status,
    title: (s.kind === "QUIZ" ? s.quiz?.title : s.game?.title) ?? null,
    teamMode: s.teamMode,
    me: { name: me.displayName, team: me.team, score: me.score, rank: board.players.find((p) => p.id === me.id)?.rank ?? null },
    index: s.currentIndex,
    total: steps.length,
    revealed: s.revealed,
    remaining: remainingSeconds(s, step),
    step: step ? { id: step.id, kind: step.kind, gameType: step.gameType ?? null, points: step.points, public: step.public } : null,
    myAnswer: mine ? { isCorrect: s.revealed ? mine.isCorrect : null, points: s.revealed ? mine.points : null } : null,
    reveal: step && s.revealed ? step.reveal : null,
    teams: s.teamMode ? board.teams : null,
    top: s.status === "FINISHED" ? board.players.slice(0, 5) : null,
  };
}

export class AnswerError extends Error {}

export async function submitAnswer(pin: string, token: string | undefined, itemId: string, answer: unknown) {
  const s = await db.gameSession.findFirst({
    where: { pin, status: "ACTIVE" },
    include: {
      quiz: { include: { questions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } } } },
      game: { include: { items: { orderBy: { sortOrder: "asc" } } } },
      lesson: { select: { id: true, title: true, lessonNumber: true } },
    },
  });
  if (!s) throw new AnswerError("gameInactive");
  const me = await findParticipant(s.id, token);
  if (!me) throw new AnswerError("notJoined");
  const step = buildSteps(s, gameLabels(await getDictionary()))[s.currentIndex];
  if (!step || step.id !== itemId) throw new AnswerError("questionClosed");
  if (s.revealed) throw new AnswerError("timeUp");
  const elapsed = Date.now() - (s.stepStartedAt?.getTime() ?? Date.now());
  if (elapsed > (step.seconds + 2) * 1000) throw new AnswerError("timeUp");

  if (typeof answer !== "object" || answer === null) throw new AnswerError("badAnswer");
  const result = step.score(answer);
  const points = livePoints(step.points, result.ratio, elapsed, step.seconds * 1000);
  try {
    await db.$transaction([
      db.sessionAnswer.create({
        data: { sessionId: s.id, participantId: me.id, itemId, answer: answer as object, isCorrect: result.correct, points },
      }),
      db.sessionParticipant.update({ where: { id: me.id }, data: { score: { increment: points } } }),
    ]);
  } catch {
    throw new AnswerError("answerAccepted");
  }
  return { accepted: true };
}
