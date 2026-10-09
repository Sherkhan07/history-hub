import type { Dictionary } from "./dictionaries/ru";
import { fmt } from "./format";

export type MsgKey = keyof Dictionary["msg"];
export type MsgVars = Record<string, string | number>;

/** Translates a server message key (or returns the text unchanged when it is not a key). */
export function translateMsg(t: Dictionary, message: string, vars?: MsgVars): string {
  const template = (t.msg as Record<string, string>)[message];
  return template ? fmt(template, vars ?? {}) : message;
}
