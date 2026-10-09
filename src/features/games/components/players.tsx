"use client";

import { useState } from "react";
import { CheckCircle2, Send, XCircle } from "lucide-react";
import type { GameType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import type { PublicQuestion } from "@/features/quizzes/scoring";
import { imageSrc } from "@/lib/files";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";
import { KzMap, MatchBoard, OptionGrid, OrderList, type OptionState } from "./primitives";

/** What to show after an answer is checked/revealed. */
export type Reveal = {
  correct?: boolean | null;
  solution?: string | null;
  /** indexes of correct options for choice-like items */
  correctOptions?: number[];
  mapTarget?: { lat: number; lon: number; radiusKm: number; label: string };
};

type PlayerProps<P, A> = {
  data: P;
  onSubmit?: (answer: A) => void;
  /** No interaction (host screen) or already answered */
  disabled?: boolean;
  reveal?: Reveal | null;
  large?: boolean;
};

export function RevealBanner({ reveal }: { reveal: Reveal }) {
  const t = useDict();
  if (reveal.correct == null && !reveal.solution) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-2xl px-5 py-4 animate-fade-up",
        reveal.correct === true ? "bg-sage-soft" : reveal.correct === false ? "bg-clay-soft" : "bg-steppe-soft",
      )}
    >
      {reveal.correct === true && <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success" aria-hidden />}
      {reveal.correct === false && <XCircle className="mt-0.5 size-6 shrink-0 text-clay" aria-hidden />}
      <div>
        {reveal.correct != null && <p className="font-heading text-lg font-semibold">{reveal.correct ? t.play.correct : t.play.incorrect}</p>}
        {reveal.solution && <p className="text-foreground/80">{fmt(t.play.answer, { a: reveal.solution })}</p>}
      </div>
    </div>
  );
}

function SubmitBar({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label?: string }) {
  const t = useDict();
  return (
    <div className="flex justify-end">
      <Button size="xl" onClick={onClick} disabled={disabled}>
        <Send /> {label ?? t.play.submit}
      </Button>
    </div>
  );
}

function Prompt({ children, large }: { children: React.ReactNode; large?: boolean }) {
  return <h2 className={cn("font-heading font-semibold text-balance", large ? "text-3xl leading-tight sm:text-4xl" : "text-2xl leading-snug")}>{children}</h2>;
}

function choiceStates(count: number, picked: number[], reveal?: Reveal | null): OptionState[] {
  return Array.from({ length: count }, (_, i) => {
    if (reveal?.correctOptions) {
      if (reveal.correctOptions.includes(i)) return "correct";
      return picked.includes(i) ? "wrong" : "dim";
    }
    return picked.includes(i) ? "selected" : "idle";
  });
}

// ───────────────────────── Quiz question ─────────────────────────

export function QuestionPlayer({ data: q, onSubmit, disabled, reveal, large }: PlayerProps<PublicQuestion, unknown>) {
  const t = useDict();
  const [picked, setPicked] = useState<number[]>([]);
  const [order, setOrder] = useState(q.options.map((o) => o.id));
  const [matches, setMatches] = useState<Record<string, string>>({});
  const locked = disabled || Boolean(reveal);

  let body: React.ReactNode;
  switch (q.type) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE":
      body = (
        <OptionGrid
          options={q.options.map((o) => o.text)}
          states={choiceStates(q.options.length, picked, reveal)}
          disabled={locked}
          onPick={(i) => {
            setPicked([i]);
            onSubmit?.({ optionIds: [q.options[i].id] });
          }}
        />
      );
      break;
    case "MULTIPLE_CHOICE":
      body = (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t.play.pickAll}</p>
          <OptionGrid
            options={q.options.map((o) => o.text)}
            states={choiceStates(q.options.length, picked, reveal)}
            disabled={locked}
            onPick={(i) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))}
          />
          {!locked && onSubmit && <SubmitBar disabled={!picked.length} onClick={() => onSubmit({ optionIds: picked.map((i) => q.options[i].id) })} />}
        </div>
      );
      break;
    case "ORDERING":
      body = (
        <div className="space-y-4">
          <OrderList items={q.options} order={order} onChange={setOrder} disabled={locked} />
          {!locked && onSubmit && <SubmitBar onClick={() => onSubmit({ order })} />}
        </div>
      );
      break;
    case "MATCHING": {
      const rights = [...new Set(q.right ?? [])].map((t) => ({ key: t, text: t }));
      body = (
        <div className="space-y-4">
          <MatchBoard left={q.options} right={rights} value={matches} onChange={setMatches} disabled={locked} />
          {!locked && onSubmit && <SubmitBar disabled={Object.keys(matches).length < q.options.length} onClick={() => onSubmit({ matches })} />}
        </div>
      );
      break;
    }
  }

  return (
    <div className="space-y-6">
      <Prompt large={large}>{q.prompt}</Prompt>
      {q.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc(q.imageUrl)!} alt="" className="max-h-72 rounded-2xl object-contain" />
      )}
      {body}
      {reveal && <RevealBanner reveal={reveal} />}
    </div>
  );
}

// ───────────────────────── Game items ─────────────────────────

type TimelineP = { prompt: string; events: { id: string; text: string }[] };
type MapP = { prompt: string };
type MatchingP = { prompt: string; left: { id: string; text: string }[]; right: { id: string; text: string }[] };
type WhoP = { clues: string[]; options: string[]; imageUrl?: string };
type TfP = { statement: string };
type DetectiveP = { caseText: string; sources: { title: string; text: string }[]; question: string; options: string[] };
type ArtifactP = { imageUrl: string; caption?: string; questions: { label: string; options: string[] }[] };
type BattleP = { prompt: string; options: string[]; imageUrl?: string };

function TimelinePlayer({ data, onSubmit, disabled, reveal, large }: PlayerProps<TimelineP, { order: string[] }>) {
  const t = useDict();
  const [order, setOrder] = useState(data.events.map((e) => e.id));
  const locked = disabled || Boolean(reveal);
  return (
    <div className="space-y-6">
      <Prompt large={large}>{data.prompt}</Prompt>
      <p className="text-sm text-muted-foreground">{t.play.earliestTop}</p>
      <OrderList items={data.events} order={order} onChange={setOrder} disabled={locked} />
      {!locked && onSubmit && <SubmitBar onClick={() => onSubmit({ order })} />}
      {reveal && <RevealBanner reveal={reveal} />}
    </div>
  );
}

function MapPlayer({ data, onSubmit, disabled, reveal, large }: PlayerProps<MapP, { lat: number; lon: number }>) {
  const t = useDict();
  const [point, setPoint] = useState<{ lat: number; lon: number } | null>(null);
  const locked = disabled || Boolean(reveal);
  return (
    <div className="space-y-5">
      <Prompt large={large}>{data.prompt}</Prompt>
      <KzMap value={point} onChange={locked ? undefined : setPoint} disabled={locked} target={reveal?.mapTarget ?? null} />
      {!locked && onSubmit && <SubmitBar disabled={!point} onClick={() => point && onSubmit(point)} label={t.play.hereIt} />}
      {reveal && <RevealBanner reveal={reveal} />}
    </div>
  );
}

function MatchingPlayer({ data, onSubmit, disabled, reveal, large }: PlayerProps<MatchingP, { matches: Record<string, string> }>) {
  const [value, setValue] = useState<Record<string, string>>({});
  const locked = disabled || Boolean(reveal);
  return (
    <div className="space-y-6">
      <Prompt large={large}>{data.prompt}</Prompt>
      <MatchBoard left={data.left} right={data.right.map((r) => ({ key: r.id, text: r.text }))} value={value} onChange={setValue} disabled={locked} />
      {!locked && onSubmit && <SubmitBar disabled={Object.keys(value).length < data.left.length} onClick={() => onSubmit({ matches: value })} />}
      {reveal && <RevealBanner reveal={reveal} />}
    </div>
  );
}

function SingleChoice({ options, onSubmit, disabled, reveal }: { options: string[]; onSubmit?: (a: { index: number }) => void; disabled?: boolean; reveal?: Reveal | null }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <OptionGrid
      options={options}
      states={choiceStates(options.length, picked == null ? [] : [picked], reveal)}
      disabled={disabled || Boolean(reveal)}
      onPick={(i) => {
        setPicked(i);
        onSubmit?.({ index: i });
      }}
    />
  );
}

function WhoAmIPlayer({ data, onSubmit, disabled, reveal, large }: PlayerProps<WhoP, { index: number }>) {
  const t = useDict();
  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{t.play.whoAmI}</p>
          {data.clues.map((c, i) => (
            <blockquote key={i} className={cn("rounded-2xl border-l-4 border-gold bg-gold-soft/60 px-5 py-3 font-heading", large ? "text-2xl" : "text-xl")}>«{c}»</blockquote>
          ))}
        </div>
        {data.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc(data.imageUrl)!} alt="" className="max-h-56 rounded-2xl object-contain" />
        )}
      </div>
      <SingleChoice options={data.options} onSubmit={onSubmit} disabled={disabled} reveal={reveal} />
      {reveal && <RevealBanner reveal={reveal} />}
    </div>
  );
}

function TrueFalsePlayer({ data, onSubmit, disabled, reveal, large }: PlayerProps<TfP, { value: boolean }>) {
  const t = useDict();
  const [picked, setPicked] = useState<boolean | null>(null);
  const locked = disabled || Boolean(reveal);
  const correctValue = reveal?.correctOptions ? reveal.correctOptions[0] === 0 : null;
  const btn = (v: boolean, label: string, tone: string) => {
    const state = correctValue != null ? (correctValue === v ? "ring-4 ring-success ring-offset-2" : "opacity-40") : picked === v ? "ring-4 ring-gold ring-offset-2" : "";
    return (
      <button
        type="button"
        disabled={locked}
        onClick={() => {
          setPicked(v);
          onSubmit?.({ value: v });
        }}
        className={cn("h-28 rounded-3xl font-heading text-3xl font-semibold text-white shadow-lift transition-all disabled:cursor-default", tone, state)}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="space-y-8">
      <Prompt large={large}>{data.statement}</Prompt>
      <div className="grid grid-cols-2 gap-4">
        {btn(true, t.play.truth, "bg-sage hover:bg-sage/90")}
        {btn(false, t.play.lie, "bg-clay hover:bg-clay/90")}
      </div>
      {reveal && <RevealBanner reveal={reveal} />}
    </div>
  );
}

function DetectivePlayer({ data, onSubmit, disabled, reveal, large }: PlayerProps<DetectiveP, { index: number }>) {
  const t = useDict();
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-ink px-6 py-5 text-white">
        <p className="text-xs font-medium tracking-widest text-gold uppercase">{t.play.caseLabel}</p>
        <p className={cn("mt-1 font-heading", large ? "text-2xl" : "text-xl")}>{data.caseText}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {data.sources.map((s, i) => (
          <div key={i} className="rounded-2xl border bg-[oklch(0.98_0.02_85)] p-5 shadow-soft">
            <p className="text-xs font-semibold tracking-wide text-[oklch(0.5_0.1_70)] uppercase">{fmt(t.play.sourceN, { n: i + 1, title: s.title })}</p>
            <p className="mt-2 leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>
      <Prompt large={large}>{data.question}</Prompt>
      <SingleChoice options={data.options} onSubmit={onSubmit} disabled={disabled} reveal={reveal} />
      {reveal && <RevealBanner reveal={reveal} />}
    </div>
  );
}

function ArtifactPlayer({ data, onSubmit, disabled, reveal }: PlayerProps<ArtifactP, { indexes: number[] }>) {
  const t = useDict();
  const [answers, setAnswers] = useState<number[]>(data.questions.map(() => -1));
  const locked = disabled || Boolean(reveal);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <figure className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc(data.imageUrl)!} alt={data.caption ?? t.play.artifact} className="w-full rounded-3xl bg-muted object-contain shadow-lift" />
        {data.caption && <figcaption className="text-center text-sm text-muted-foreground">{data.caption}</figcaption>}
      </figure>
      <div className="space-y-5">
        {data.questions.map((q, qi) => (
          <fieldset key={qi} className="space-y-2">
            <legend className="mb-2 font-heading text-lg font-semibold">{q.label}</legend>
            <div className="flex flex-wrap gap-2">
              {q.options.map((o, oi) => {
                const correct = reveal?.correctOptions?.[qi];
                const selected = answers[qi] === oi;
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={locked}
                    onClick={() => setAnswers((a) => a.map((x, i) => (i === qi ? oi : x)))}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition-colors",
                      selected ? "border-steppe bg-steppe text-white" : "bg-card hover:bg-muted",
                      correct != null && correct === oi && "border-success bg-success text-white",
                      correct != null && selected && correct !== oi && "border-clay bg-clay-soft text-foreground",
                    )}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
        {!locked && onSubmit && <SubmitBar disabled={answers.some((a) => a < 0)} onClick={() => onSubmit({ indexes: answers })} />}
        {reveal && <RevealBanner reveal={reveal} />}
      </div>
    </div>
  );
}

function BattlePlayer({ data, onSubmit, disabled, reveal, large }: PlayerProps<BattleP, { index: number }>) {
  return (
    <div className="space-y-6">
      <Prompt large={large}>{data.prompt}</Prompt>
      {data.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc(data.imageUrl)!} alt="" className="max-h-64 rounded-2xl object-contain" />
      )}
      <SingleChoice options={data.options} onSubmit={onSubmit} disabled={disabled} reveal={reveal} />
      {reveal && <RevealBanner reveal={reveal} />}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any -- registry of heterogeneous players, data validated by definitions */
export const GAME_PLAYERS: Record<GameType, React.ComponentType<PlayerProps<any, any>>> = {
  TIMELINE: TimelinePlayer,
  MAP_POINT: MapPlayer,
  MATCHING: MatchingPlayer,
  WHO_AM_I: WhoAmIPlayer,
  TRUE_FALSE: TrueFalsePlayer,
  HISTORICAL_DETECTIVE: DetectivePlayer,
  ARTIFACT: ArtifactPlayer,
  TEAM_BATTLE: BattlePlayer,
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function GameItemPlayer({ type, ...props }: { type: GameType } & PlayerProps<unknown, unknown>) {
  const Player = GAME_PLAYERS[type];
  return <Player {...props} />;
}
