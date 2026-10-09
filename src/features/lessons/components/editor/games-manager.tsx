"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { GameType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, SectionCard } from "@/components/common/form-controls";
import { Icon } from "@/components/common/icon";
import { GAME_DEFINITIONS, GAME_TYPES } from "@/features/games/definitions";
import { GameEditor, type EditableGame } from "@/features/games/components/game-editor";
import { useDict } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { createGameAction } from "../../editor-actions";
import { useSave } from "./use-save";

export function GamesManager({ lessonId, games, readOnly }: { lessonId: string; games: EditableGame[]; readOnly?: boolean }) {
  const t = useDict();
  const [type, setType] = useState<GameType>("TIMELINE");
  const [title, setTitle] = useState("");
  const { pending, run } = useSave();
  return (
    <div className="space-y-6">
      {!readOnly && (
        <SectionCard title={t.editor.newGame} description={t.editor.newGameText}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label={t.editor.gameType}>
            {GAME_TYPES.map((gt) => (
              <button
                key={gt}
                type="button"
                role="radio"
                aria-checked={type === gt}
                onClick={() => setType(gt)}
                className={cn("flex items-start gap-3 rounded-xl border p-3 text-left transition-colors", type === gt ? "border-steppe bg-steppe-soft" : "bg-card hover:bg-muted")}
              >
                <Icon name={GAME_DEFINITIONS[gt].icon} className="mt-0.5 size-5 shrink-0 text-steppe" />
                <span>
                  <span className="block text-sm font-medium">{t.gameTypes[gt]}</span>
                  <span className="text-xs text-muted-foreground">{t.gameTypeHints[gt]}</span>
                </span>
              </button>
            ))}
          </div>
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => createGameAction(lessonId, type, title || t.gameTypes[type]), { success: t.editor.gameCreated, onSuccess: () => setTitle("") });
            }}
          >
            <Field label={t.editor.name} htmlFor="game-title" className="min-w-64 flex-1">
              <Input id="game-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.gameTypes[type]} />
            </Field>
            <Button type="submit" disabled={pending}><Plus /> {t.common.create}</Button>
          </form>
        </SectionCard>
      )}
      {games.map((g) => <GameEditor key={g.id + g.items.length + g.title} game={g} readOnly={readOnly} />)}
      {!games.length && readOnly && <p className="text-sm text-muted-foreground">{t.editor.noGames}</p>}
    </div>
  );
}
