"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorize } from "@/server/auth/guards";
import { audit } from "@/server/audit";
import { invalidateCatalog } from "@/server/cache";
import { ActionError, runAction } from "@/server/actions/result";
import { settingsSchema } from "@/server/settings";

const cuid = z.string().cuid();

function refresh() {
  invalidateCatalog();
  revalidatePath("/admin/curriculum");
  revalidatePath("/admin/subjects");
  revalidatePath("/admin/grades");
}

const subjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  nameKk: z.string().trim().max(120).optional().transform((v) => v || null),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/, "slugFormat"),
  description: z.string().trim().max(300).optional().transform((v) => v || null),
  descriptionKk: z.string().trim().max(300).optional().transform((v) => v || null),
  accent: z.enum(["kz", "world"]),
  isActive: z.boolean().default(true),
});

export async function saveSubjectAction(subjectId: string | null, input: z.input<typeof subjectSchema>) {
  return runAction(async () => {
    const admin = await authorize("curriculum.manage");
    const data = subjectSchema.parse(input);
    const clash = await db.subject.findFirst({ where: { slug: data.slug, ...(subjectId ? { id: { not: subjectId } } : {}) } });
    if (clash) throw new ActionError("slugTaken");
    const s = subjectId
      ? await db.subject.update({ where: { id: cuid.parse(subjectId) }, data })
      : await db.subject.create({ data: { ...data, sortOrder: (await db.subject.count()) + 1 } });
    await audit({ actorId: admin.id, action: subjectId ? "subject.update" : "subject.create", entityType: "Subject", entityId: s.id, metadata: { name: s.name } });
    refresh();
    return { message: "subjectSaved" };
  });
}

export async function setGradeActiveAction(gradeId: string, isActive: boolean) {
  return runAction(async () => {
    const admin = await authorize("curriculum.manage");
    const g = await db.grade.update({ where: { id: cuid.parse(gradeId) }, data: { isActive } });
    await audit({ actorId: admin.id, action: "grade.update", entityType: "Grade", entityId: g.id, metadata: { number: g.number, isActive } });
    refresh();
    return { message: isActive ? "gradeOn" : "gradeOff", vars: { n: g.number } };
  });
}

const curriculumSchema = z.object({
  subjectId: cuid,
  gradeId: cuid,
  academicYear: z.string().regex(/^\d{4}\/\d{4}$/, "yearFormat"),
  language: z.enum(["kk", "ru"]),
});

export async function createCurriculumAction(input: z.input<typeof curriculumSchema>) {
  return runAction(async () => {
    const admin = await authorize("curriculum.manage");
    const data = curriculumSchema.parse(input);
    const exists = await db.curriculum.findUnique({ where: { subjectId_gradeId_academicYear_language: data } });
    if (exists) throw new ActionError("programExists");
    const c = await db.curriculum.create({ data: { ...data, quarters: { create: [1, 2, 3, 4].map((number) => ({ number })) } } });
    await audit({ actorId: admin.id, action: "curriculum.create", entityType: "Curriculum", entityId: c.id, metadata: data });
    refresh();
    return { message: "programCreated" };
  });
}

export async function setCurriculumActiveAction(curriculumId: string, isActive: boolean) {
  return runAction(async () => {
    const admin = await authorize("curriculum.manage");
    await db.curriculum.update({ where: { id: cuid.parse(curriculumId) }, data: { isActive } });
    await audit({ actorId: admin.id, action: "curriculum.update", entityType: "Curriculum", entityId: curriculumId, metadata: { isActive } });
    refresh();
    return { message: "saved" };
  });
}

export async function saveQuarterTitleAction(quarterId: string, title: string) {
  return runAction(async () => {
    const admin = await authorize("curriculum.manage");
    await db.quarter.update({ where: { id: cuid.parse(quarterId) }, data: { title: z.string().trim().max(120).parse(title) || null } });
    await audit({ actorId: admin.id, action: "quarter.update", entityType: "Quarter", entityId: quarterId });
    refresh();
    return { message: "saved" };
  });
}

export async function saveSectionAction(quarterId: string, sectionId: string | null, title: string) {
  return runAction(async () => {
    const admin = await authorize("curriculum.manage");
    const t = z.string().trim().min(2, "sectionNameRequired").max(200).parse(title);
    const qid = cuid.parse(quarterId);
    const s = sectionId
      ? await db.section.update({ where: { id: cuid.parse(sectionId) }, data: { title: t } })
      : await db.section.create({ data: { quarterId: qid, title: t, sortOrder: await db.section.count({ where: { quarterId: qid } }) } });
    await audit({ actorId: admin.id, action: sectionId ? "section.update" : "section.create", entityType: "Section", entityId: s.id, metadata: { title: t } });
    refresh();
    return { message: "sectionSaved" };
  });
}

export async function moveSectionAction(sectionId: string, direction: -1 | 1) {
  return runAction(async () => {
    await authorize("curriculum.manage");
    const s = await db.section.findUnique({ where: { id: cuid.parse(sectionId) } });
    if (!s) throw new ActionError("sectionNotFound");
    const siblings = await db.section.findMany({ where: { quarterId: s.quarterId }, orderBy: { sortOrder: "asc" } });
    const i = siblings.findIndex((x) => x.id === s.id);
    const j = i + direction;
    if (j < 0 || j >= siblings.length) return;
    const order = [...siblings];
    [order[i], order[j]] = [order[j], order[i]];
    await db.$transaction(order.map((x, k) => db.section.update({ where: { id: x.id }, data: { sortOrder: k } })));
    refresh();
  });
}

export async function deleteSectionAction(sectionId: string) {
  return runAction(async () => {
    const admin = await authorize("curriculum.manage");
    const s = await db.section.findUnique({ where: { id: cuid.parse(sectionId) }, include: { _count: { select: { lessons: true } } } });
    if (!s) throw new ActionError("sectionNotFound");
    if (s._count.lessons > 0) throw new ActionError("sectionHasLessons");
    await db.section.delete({ where: { id: s.id } });
    await audit({ actorId: admin.id, action: "section.delete", entityType: "Section", entityId: s.id, metadata: { title: s.title } });
    refresh();
    return { message: "sectionDeleted" };
  });
}

export async function saveSettingsAction(input: Record<string, unknown>) {
  return runAction(async () => {
    const admin = await authorize("settings.manage");
    const data = settingsSchema.parse(input);
    await db.$transaction(Object.entries(data).map(([key, value]) => db.setting.upsert({ where: { key }, update: { value }, create: { key, value } })));
    await audit({ actorId: admin.id, action: "settings.update", entityType: "Setting", metadata: data });
    revalidatePath("/admin/settings");
    revalidatePath("/teacher");
    return { message: "settingsSaved" };
  });
}
