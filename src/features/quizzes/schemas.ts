import { z } from "zod";

const optionSchema = z.object({
  id: z.string().optional(),
  text: z.string().trim().min(1, "optionText").max(500),
  isCorrect: z.boolean().default(false),
  matchText: z.string().trim().max(500).optional().nullable(),
  correctOrder: z.number().int().min(0).optional().nullable(),
});

export const questionInputSchema = z
  .object({
    id: z.string().optional(),
    type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "MATCHING", "ORDERING"]),
    prompt: z.string().trim().min(1, "questionText").max(2000),
    explanation: z.string().trim().max(2000).optional().nullable(),
    points: z.number().int().min(10).max(1000).default(100),
    options: z.array(optionSchema).min(2, "minTwoOptions").max(8),
  })
  .superRefine((q, ctx) => {
    const correct = q.options.filter((o) => o.isCorrect).length;
    if ((q.type === "SINGLE_CHOICE" || q.type === "TRUE_FALSE") && correct !== 1) {
      ctx.addIssue({ code: "custom", message: "exactlyOneCorrect", path: ["options"] });
    }
    if (q.type === "MULTIPLE_CHOICE" && correct < 1) {
      ctx.addIssue({ code: "custom", message: "atLeastOneCorrect", path: ["options"] });
    }
    if (q.type === "MATCHING" && q.options.some((o) => !o.matchText)) {
      ctx.addIssue({ code: "custom", message: "matchingPairs", path: ["options"] });
    }
  });

export const quizInputSchema = z.object({
  title: z.string().trim().min(1, "quizTitle").max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  timePerQuestion: z.number().int().min(5).max(300).default(30),
  questions: z.array(questionInputSchema).max(60),
});

export type QuestionInput = z.infer<typeof questionInputSchema>;
export type QuizInput = z.infer<typeof quizInputSchema>;
