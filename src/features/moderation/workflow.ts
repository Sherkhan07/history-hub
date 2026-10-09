import type { ContentStatus } from "@/generated/prisma/enums";
import { can, type Actor, type Permission } from "@/server/auth/permissions";

export type WorkflowAction =
  | "submit"
  | "approve"
  | "reject"
  | "publish"
  | "approvePublish"
  | "unpublish"
  | "revise"
  | "archive"
  | "restore";

type Transition = { from: readonly ContentStatus[]; to: ContentStatus; permission: Permission };

export const TRANSITIONS: Record<WorkflowAction, Transition> = {
  submit: { from: ["DRAFT", "REJECTED"], to: "IN_REVIEW", permission: "lessons.edit" },
  approve: { from: ["IN_REVIEW"], to: "APPROVED", permission: "lessons.review" },
  reject: { from: ["IN_REVIEW", "APPROVED"], to: "REJECTED", permission: "lessons.review" },
  publish: { from: ["APPROVED"], to: "PUBLISHED", permission: "lessons.publish" },
  approvePublish: { from: ["IN_REVIEW"], to: "PUBLISHED", permission: "lessons.publish" },
  unpublish: { from: ["PUBLISHED"], to: "DRAFT", permission: "lessons.publish" },
  /** Moderator takes a published/approved lesson back to draft to update it */
  revise: { from: ["APPROVED", "PUBLISHED"], to: "DRAFT", permission: "lessons.edit" },
  archive: { from: ["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "REJECTED"], to: "ARCHIVED", permission: "lessons.archive" },
  restore: { from: ["ARCHIVED"], to: "DRAFT", permission: "lessons.archive" },
};

export function canTransition(actor: Actor | null | undefined, status: ContentStatus, action: WorkflowAction): boolean {
  const t = TRANSITIONS[action];
  return t.from.includes(status) && can(actor, t.permission);
}

export function availableActions(actor: Actor | null | undefined, status: ContentStatus): WorkflowAction[] {
  const actions = (Object.keys(TRANSITIONS) as WorkflowAction[]).filter((a) => canTransition(actor, status, a));
  // Admins publish directly — hide the redundant "revise" for them when "unpublish" exists
  if (actor?.role === "ADMIN") return actions.filter((a) => a !== "revise");
  return actions;
}

export type ReviewReadinessInput = {
  title: string;
  objectives: number;
  resources: number;
  quizzes: number;
  games: number;
};

export type ReviewBlocker = "title" | "objectives" | "materials";

/** Problems that block sending a lesson to review (dictionary keys of `workflow.blockers`). Empty = ready. */
export function reviewBlockers(l: ReviewReadinessInput): ReviewBlocker[] {
  const issues: ReviewBlocker[] = [];
  if (!l.title.trim()) issues.push("title");
  if (l.objectives < 1) issues.push("objectives");
  if (l.resources + l.quizzes + l.games < 1) issues.push("materials");
  return issues;
}
