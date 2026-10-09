import JSZip from "jszip";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { canViewLesson } from "@/server/auth/permissions";
import { getLessonDetail } from "@/features/lessons/server/queries";
import { storage } from "@/server/storage";
import { contentDisposition } from "@/server/files-access";
import { parseCards, parseHomework, parseTasks } from "@/features/resources/content";
import { getI18n } from "@/i18n";
import { fmt } from "@/i18n/format";
import { subjectName } from "@/features/curriculum/subject-name";
import { audit } from "@/server/audit";

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

/** Bundles every original file of a lesson plus a plain-text lesson sheet into one ZIP. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/lessons/[id]/download">) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { t, locale } = await getI18n();
  const { id } = await ctx.params;
  const lesson = await getLessonDetail(id);
  if (!lesson || !canViewLesson(user, lesson.status)) return new NextResponse("Not found", { status: 404 });

  const zip = new JSZip();
  const store = storage();
  const lines: string[] = [
    `${lesson.lessonNumber}. ${lesson.title}`,
    fmt(t.sheet.where, { subject: subjectName(lesson.section.quarter.curriculum.subject, locale), grade: lesson.section.quarter.curriculum.grade.number, q: lesson.section.quarter.number }),
    "",
  ];
  if (lesson.researchQuestion) lines.push(`${t.lesson.researchQuestion}: ${lesson.researchQuestion}`, "");
  if (lesson.objectives.length) {
    lines.push(`${t.lesson.objectives}:`, ...lesson.objectives.map((o) => `  ${o.code ? o.code + " — " : "• "}${o.text}`), "");
  }
  if (lesson.stages.length) {
    lines.push(`${t.lesson.scenario}:`, ...lesson.stages.map((s, i) => `  ${fmt(t.sheet.stageLine, { n: i + 1, title: s.title, m: s.durationMinutes })}`), "");
  }

  for (const [i, r] of lesson.resources.entries()) {
    const prefix = String(i + 1).padStart(2, "0");
    if (r.fileUrl) {
      const obj = await store.get(r.fileUrl);
      if (obj) {
        const ext = r.fileUrl.split(".").pop();
        zip.file(`${prefix} ${safeName(t.resourceTypes[r.type])} — ${safeName(r.title)}.${ext}`, await readAll(obj.body), { compression: "STORE" });
      }
    }
    const tasks = r.type === "TASK" ? parseTasks(r.content) : [];
    if (tasks.length) {
      lines.push(`${r.title}:`);
      for (const task of tasks) lines.push(`  • ${task.title}`, `    ${task.instructions}`, ...(task.answer ? [`    ${fmt(t.sheet.answer, { a: task.answer })}`] : []));
      lines.push("");
    }
    const cards = r.type === "CARDS" ? parseCards(r.content) : [];
    if (cards.length) lines.push(`${r.title}:`, ...cards.map((c) => `  • ${c.front} — ${c.back}`), "");
    const hw = r.type === "HOMEWORK" ? parseHomework(r.content) : null;
    if (hw) lines.push(`${t.resourceTypes.HOMEWORK}: ${hw}`, "");
  }
  zip.file(t.sheet.fileName, "﻿" + lines.join("\r\n"));

  const data = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  await audit({ actorId: user.id, action: "lesson.download", entityType: "Lesson", entityId: lesson.id });
  return new NextResponse(Buffer.from(data), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": contentDisposition("attachment", `${lesson.lessonNumber} ${safeName(lesson.title)}.zip`),
      "Cache-Control": "private, no-store",
    },
  });
}
