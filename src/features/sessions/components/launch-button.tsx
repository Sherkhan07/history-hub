"use client";

import { useState, useTransition } from "react";
import { Loader2, Radio } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { createLiveSessionAction } from "../actions";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";

export function LaunchForClassButton({
  lessonId,
  quizId,
  gameId,
  title,
  teamOnly,
  variant = "default",
  size = "default",
  label,
  returnTo,
}: {
  lessonId: string;
  quizId?: string;
  gameId?: string;
  title: string;
  teamOnly?: boolean;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "lg" | "sm";
  label?: string;
  /** Where the host screen's "back" button leads (e.g. back into presentation mode) */
  returnTo?: string;
}) {
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState(Boolean(teamOnly));
  const [pending, start] = useTransition();
  const launch = () =>
    start(async () => {
      const res = await createLiveSessionAction({ lessonId, quizId, gameId, teamMode: team, returnTo });
      if (res && !res.ok) toast.error(res.error);
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Radio /> {label ?? t.lesson.launchForClass}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.session.launchTitle}</DialogTitle>
          <DialogDescription>
            {fmt(t.session.launchText, { title })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between rounded-xl border p-4">
          <div>
            <Label htmlFor="team-mode" className="text-base">{t.session.teamMode}</Label>
            <p className="text-sm text-muted-foreground">{t.session.teamModeText}</p>
          </div>
          <Switch id="team-mode" checked={team} onCheckedChange={setTeam} disabled={teamOnly} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
          <Button size="lg" onClick={launch} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Radio />} {t.session.createGame}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
