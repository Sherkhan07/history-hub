import { z } from "zod";
import type { ResourceType } from "@/generated/prisma/enums";

/** Structured (non-file) content stored in Resource.content */
export const taskContentSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(1, "taskTitle").max(200),
        instructions: z.string().trim().min(1, "taskInstructions").max(4000),
        mode: z.enum(["individual", "pair", "group"]).default("individual"),
        minutes: z.number().int().min(1).max(45).optional(),
        answer: z.string().trim().max(4000).optional(),
        slide: z.number().int().min(1).optional(),
      }),
    )
    .max(30),
});

export const cardsContentSchema = z.object({
  cards: z
    .array(
      z.object({
        front: z.string().trim().min(1, "cardFront").max(500),
        back: z.string().trim().min(1, "cardBack").max(1000),
      }),
    )
    .max(80),
});

export const homeworkContentSchema = z.object({
  text: z.string().trim().min(1).max(4000),
});

export type TaskContent = z.infer<typeof taskContentSchema>;
export type CardsContent = z.infer<typeof cardsContentSchema>;
export type HomeworkContent = z.infer<typeof homeworkContentSchema>;

export function parseTasks(content: unknown): TaskContent["tasks"] {
  const r = taskContentSchema.safeParse(content);
  return r.success ? r.data.tasks : [];
}

export function parseCards(content: unknown): CardsContent["cards"] {
  const r = cardsContentSchema.safeParse(content);
  return r.success ? r.data.cards : [];
}

export function parseHomework(content: unknown): string | null {
  const r = homeworkContentSchema.safeParse(content);
  return r.success ? r.data.text : null;
}

export const RESOURCE_ORDER: ResourceType[] = [
  "PRESENTATION",
  "WORKSHEET",
  "TASK",
  "CARDS",
  "MAP",
  "VIDEO",
  "TEACHER_GUIDE",
  "HOMEWORK",
  "DOCUMENT",
  "ADDITIONAL",
];
