"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useDict } from "@/i18n/provider";

type Result = { ok: true; message?: string } | { ok: false; error: string };

/**
 * Wraps a destructive/irreversible server action with a confirmation dialog.
 * Optionally collects a comment (e.g. rejection reason).
 */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  action,
  successMessage,
  withComment,
  commentRequired,
  commentLabel,
  destructive,
  onDone,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel: string;
  action: (comment?: string) => Promise<Result>;
  successMessage?: string;
  withComment?: boolean;
  commentRequired?: boolean;
  commentLabel?: string;
  destructive?: boolean;
  onDone?: () => void;
}) {
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = () =>
    start(async () => {
      const res = await action(withComment ? comment : undefined);
      if (res.ok) {
        toast.success(res.message ?? successMessage ?? t.common.done);
        setOpen(false);
        setComment("");
        onDone?.();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {withComment && (
          <div className="space-y-2">
            <Label htmlFor="confirm-comment">{commentLabel ?? t.common.comment}</Label>
            <Textarea id="confirm-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={4} maxLength={2000} />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              run();
            }}
            disabled={pending || (commentRequired && !comment.trim())}
            className={destructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
          >
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
