import "server-only";
import { ZodError } from "zod";
import { AuthError } from "@/server/auth/guards";
import { getDictionary } from "@/i18n";
import { translateMsg, type MsgKey, type MsgVars } from "@/i18n/msg";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Domain error whose message is a key of the `msg` dictionary namespace. */
export class ActionError extends Error {
  constructor(
    public readonly key: MsgKey,
    public readonly vars?: MsgVars,
  ) {
    super(key);
  }
}

/**
 * Wraps a server action body: converts auth/validation/domain errors into a typed result and
 * translates message keys into the user's language. A returned `{ message, vars }` is translated too.
 */
export async function runAction<T>(fn: () => Promise<T | ActionResult<T>>): Promise<ActionResult<T>> {
  const t = await getDictionary();
  try {
    const value = await fn();
    if (value && typeof value === "object" && "ok" in value) {
      const r = value as ActionResult<T>;
      return r.ok && r.message ? { ...r, message: translateMsg(t, r.message) } : r;
    }
    if (value && typeof value === "object" && "message" in value && typeof (value as { message: unknown }).message === "string") {
      const v = value as T & { message: string; vars?: MsgVars };
      return { ok: true, data: { ...v, message: translateMsg(t, v.message, v.vars) } };
    }
    return { ok: true, data: value as T };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: translateMsg(t, e.message) };
    if (e instanceof ActionError) return { ok: false, error: translateMsg(t, e.key, e.vars) };
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of e.issues) {
        const key = issue.path.join(".") || "_";
        (fieldErrors[key] ??= []).push(translateMsg(t, issue.message));
      }
      return { ok: false, error: translateMsg(t, e.issues[0]?.message ?? "formInvalid"), fieldErrors };
    }
    // Next.js redirect()/notFound() throw special errors that must propagate
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { ok: false, error: t.msg.actionFailed };
  }
}
