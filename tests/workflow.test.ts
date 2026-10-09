import { describe, expect, it } from "vitest";
import { availableActions, canTransition, reviewBlockers } from "@/features/moderation/workflow";
import type { Actor } from "@/server/auth/permissions";

const admin: Actor = { id: "a", role: "ADMIN", canReview: true };
const mod: Actor = { id: "m", role: "MODERATOR", canReview: false };
const senior: Actor = { id: "s", role: "MODERATOR", canReview: true };
const teacher: Actor = { id: "t", role: "TEACHER", canReview: false };

describe("moderation workflow", () => {
  it("DRAFT → IN_REVIEW → APPROVED → PUBLISHED", () => {
    expect(canTransition(mod, "DRAFT", "submit")).toBe(true);
    expect(canTransition(mod, "IN_REVIEW", "approve")).toBe(false);
    expect(canTransition(senior, "IN_REVIEW", "approve")).toBe(true);
    expect(canTransition(senior, "APPROVED", "publish")).toBe(false);
    expect(canTransition(admin, "APPROVED", "publish")).toBe(true);
  });
  it("admin can approve and publish in one step", () => {
    expect(canTransition(admin, "IN_REVIEW", "approvePublish")).toBe(true);
    expect(canTransition(admin, "DRAFT", "approvePublish")).toBe(false);
  });
  it("rejected lessons can be resubmitted", () => {
    expect(canTransition(senior, "IN_REVIEW", "reject")).toBe(true);
    expect(canTransition(mod, "REJECTED", "submit")).toBe(true);
  });
  it("teachers have no workflow actions", () => {
    expect(availableActions(teacher, "DRAFT")).toEqual([]);
    expect(availableActions(teacher, "PUBLISHED")).toEqual([]);
  });
  it("archive/restore is admin only", () => {
    expect(canTransition(mod, "DRAFT", "archive")).toBe(false);
    expect(canTransition(admin, "PUBLISHED", "archive")).toBe(true);
    expect(canTransition(admin, "ARCHIVED", "restore")).toBe(true);
  });
  it("blocks review of empty lessons", () => {
    expect(reviewBlockers({ title: "X", objectives: 0, resources: 0, quizzes: 0, games: 0 })).toHaveLength(2);
    expect(reviewBlockers({ title: "X", objectives: 1, resources: 1, quizzes: 0, games: 0 })).toEqual([]);
  });
});
