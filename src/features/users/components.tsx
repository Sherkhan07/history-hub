"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Loader2, Lock, LockOpen, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, NativeSelect } from "@/components/common/form-controls";
import { ConfirmAction } from "@/components/common/confirm-action";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";
import { createResetLinkAction, createUserAction, setBlockedAction, updateUserAction } from "./actions";

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("") + "#7";
}

export function CreateUserDialog({ defaultRole }: { defaultRole: Role }) {
  const t = useDict();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [v, setV] = useState({ name: "", email: "", role: defaultRole, school: "", password: generatePassword(), canReview: false });
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await createUserAction(v);
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.data?.message ?? t.common.done);
      setCreated({ email: v.email, password: v.password });
      router.refresh();
    });
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setCreated(null); setV({ name: "", email: "", role: defaultRole, school: "", password: generatePassword(), canReview: false }); } }}>
      <DialogTrigger asChild><Button size="lg"><UserPlus /> {t.users.createAccount}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.users.newAccount}</DialogTitle>
          <DialogDescription>{t.users.newAccountText}</DialogDescription>
        </DialogHeader>
        {created ? (
          <div className="space-y-3">
            <p className="text-sm">{t.users.createdText}</p>
            <div className="rounded-xl bg-muted p-4 font-mono text-sm">
              <p>{created.email}</p>
              <p>{created.password}</p>
            </div>
            <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(`${created.email}\n${created.password}`); toast.success(t.common.copied); }}><Copy /> {t.common.copy}</Button>
          </div>
        ) : (
          <form id="create-user" onSubmit={submit} className="grid gap-4">
            <Field label={t.users.fullName} htmlFor="u-name"><Input id="u-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></Field>
            <Field label="Email" htmlFor="u-email"><Input id="u-email" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.users.role} htmlFor="u-role">
                <NativeSelect id="u-role" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value as Role })}>
                  {(["TEACHER", "MODERATOR", "ADMIN"] as Role[]).map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
                </NativeSelect>
              </Field>
              <Field label={t.users.school} htmlFor="u-school"><Input id="u-school" value={v.school} onChange={(e) => setV({ ...v, school: e.target.value })} /></Field>
            </div>
            <Field label={t.users.tempPassword} htmlFor="u-pass" hint={t.users.tempPasswordHint}>
              <Input id="u-pass" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} minLength={8} required className="font-mono" />
            </Field>
            {v.role === "MODERATOR" && (
              <label className="flex items-center gap-3 text-sm"><Switch checked={v.canReview} onCheckedChange={(canReview) => setV({ ...v, canReview })} /> {t.users.senior}</label>
            )}
          </form>
        )}
        <DialogFooter>
          {created ? <Button onClick={() => setOpen(false)}>{t.common.done}</Button> : <Button type="submit" form="create-user" disabled={pending}>{pending && <Loader2 className="animate-spin" />} {t.common.create}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type UserRowData = { id: string; name: string; email: string; role: Role; school: string | null; canReview: boolean; isBlocked: boolean };

export function UserRowActions({ user, self }: { user: UserRowData; self: boolean }) {
  const t = useDict();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [v, setV] = useState({ name: user.name, role: user.role, school: user.school ?? "", canReview: user.canReview });
  const [link, setLink] = useState<string | null>(null);

  return (
    <div className="flex justify-end gap-1">
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setLink(null); }}>
        <DialogTrigger asChild><Button variant="ghost" size="icon" aria-label={fmt(t.users.editUser, { name: user.name })}><Pencil /></Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{user.email}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <Field label={t.users.name} htmlFor={`n-${user.id}`}><Input id={`n-${user.id}`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.users.role} htmlFor={`r-${user.id}`}>
                <NativeSelect id={`r-${user.id}`} value={v.role} onChange={(e) => setV({ ...v, role: e.target.value as Role })} disabled={self}>
                  {(["TEACHER", "MODERATOR", "ADMIN"] as Role[]).map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
                </NativeSelect>
              </Field>
              <Field label={t.users.school} htmlFor={`s-${user.id}`}><Input id={`s-${user.id}`} value={v.school} onChange={(e) => setV({ ...v, school: e.target.value })} /></Field>
            </div>
            {v.role === "MODERATOR" && (
              <label className="flex items-center gap-3 text-sm"><Switch checked={v.canReview} onCheckedChange={(canReview) => setV({ ...v, canReview })} /> {t.users.senior}</label>
            )}
            <div className="rounded-xl border p-4">
              <p className="text-sm font-medium">{t.users.resetTitle}</p>
              <p className="mb-3 text-xs text-muted-foreground">{t.users.resetText}</p>
              {link ? (
                <div className="flex gap-2">
                  <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
                  <Button variant="outline" size="icon" onClick={() => { void navigator.clipboard.writeText(link); toast.success(t.users.linkCopied); }} aria-label={t.users.copyLink}><Copy /></Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => { const r = await createResetLinkAction(user.id); if (r.ok && r.data) setLink(r.data.link); else if (!r.ok) toast.error(r.error); })}>
                  <KeyRound /> {t.users.createLink}
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await updateUserAction(user.id, v);
                  if (r.ok) { toast.success(r.data?.message ?? t.common.saved); setOpen(false); router.refresh(); } else toast.error(r.error);
                })
              }
            >
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!self && (
        <ConfirmAction
          trigger={<Button variant="ghost" size="icon" aria-label={user.isBlocked ? t.users.unblock : t.users.block}>{user.isBlocked ? <LockOpen /> : <Lock />}</Button>}
          title={fmt(user.isBlocked ? t.users.unblockQ : t.users.blockQ, { name: user.name })}
          description={user.isBlocked ? t.users.unblockText : t.users.blockText}
          confirmLabel={user.isBlocked ? t.users.unblock : t.users.block}
          destructive={!user.isBlocked}
          action={async () => {
            const r = await setBlockedAction(user.id, !user.isBlocked);
            return r.ok ? { ok: true, message: r.data?.message } : r;
          }}
        />
      )}
    </div>
  );
}
