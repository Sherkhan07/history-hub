"use client";

import { Archive, ArrowUpFromLine, CheckCheck, CircleCheck, RotateCcw, Send, Undo2, EyeOff } from "lucide-react";
import type { ContentStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/common/confirm-action";
import type { Actor } from "@/server/auth/permissions";
import { availableActions, type WorkflowAction } from "../workflow";
import { transitionLessonAction } from "../actions";
import { useDict } from "@/i18n/provider";

const META: Record<WorkflowAction, { icon: typeof Send; variant: "default" | "outline" | "destructive" | "secondary"; comment?: "optional" | "required" }> = {
  submit: { icon: Send, variant: "default", comment: "optional" },
  approve: { icon: CircleCheck, variant: "outline", comment: "optional" },
  approvePublish: { icon: CheckCheck, variant: "default", comment: "optional" },
  publish: { icon: ArrowUpFromLine, variant: "default" },
  reject: { icon: Undo2, variant: "outline", comment: "required" },
  unpublish: { icon: EyeOff, variant: "outline", comment: "optional" },
  revise: { icon: RotateCcw, variant: "outline", comment: "optional" },
  archive: { icon: Archive, variant: "destructive" },
  restore: { icon: RotateCcw, variant: "outline" },
};

const ORDER: WorkflowAction[] = ["submit", "approvePublish", "publish", "approve", "reject", "revise", "unpublish", "restore", "archive"];

export function WorkflowActions({ lessonId, status, actor, size = "default", only }: { lessonId: string; status: ContentStatus; actor: Actor; size?: "default" | "sm" | "lg"; only?: WorkflowAction[] }) {
  const t = useDict();
  const actions = availableActions(actor, status).filter((a) => !only || only.includes(a));
  // Admin sees approve+publish in one step; plain "approve" is for senior moderators
  const visible = ORDER.filter((a) => actions.includes(a) && !(a === "approve" && actions.includes("approvePublish")));
  if (!visible.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((a) => {
        const m = META[a];
        const text = t.workflow[a];
        return (
          <ConfirmAction
            key={a}
            trigger={
              <Button variant={m.variant} size={size}>
                <m.icon /> {text.label}
              </Button>
            }
            title={text.title}
            description={text.text}
            confirmLabel={text.label}
            withComment={Boolean(m.comment)}
            commentRequired={m.comment === "required"}
            commentLabel={a === "reject" ? t.workflow.whatToFix : t.common.commentOptional}
            destructive={a === "archive"}
            action={async (comment) => {
              const r = await transitionLessonAction(lessonId, a, comment);
              return r.ok ? { ok: true, message: r.message } : { ok: false, error: r.error };
            }}
          />
        );
      })}
    </div>
  );
}
