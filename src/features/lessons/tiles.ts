import type { LessonDetail } from "./server/queries";
import type { MaterialTile } from "./components/materials-grid";
import { RESOURCE_ICONS } from "@/components/common/icon";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { fmt } from "@/i18n/format";
import { countLabel } from "@/lib/format";
import { parseCards, parseTasks } from "@/features/resources/content";

const TONE: Record<string, MaterialTile["tone"]> = {
  PRESENTATION: "steppe",
  WORKSHEET: "sage",
  TASK: "gold",
  CARDS: "clay",
  HOMEWORK: "ink",
  TEACHER_GUIDE: "steppe",
  VIDEO: "clay",
  MAP: "sage",
  DOCUMENT: "ink",
  ADDITIONAL: "ink",
};

function fileMeta(r: LessonDetail["resources"][number], t: Dictionary): string {
  const ext = r.fileUrl?.split(".").pop()?.toUpperCase();
  if (r.pageCount && r.previewKind === "IMAGES") return countLabel(r.pageCount, t.catalog.slides);
  if (r.pageCount && ext === "PDF") return fmt(t.lesson.pdfPages, { n: r.pageCount });
  if (ext) return ext;
  if (r.externalUrl) return t.lesson.link;
  return t.lesson.text;
}

/** The lesson material tiles in teacher order: presentation → tasks → cards → quiz → games → rest. */
export function buildMaterialTiles(lesson: LessonDetail, t: Dictionary, base = `/teacher/lesson/${lesson.id}`): MaterialTile[] {
  const tiles: MaterialTile[] = [];
  const res = (r: LessonDetail["resources"][number], meta: string): MaterialTile => ({
    key: r.id,
    href: `${base}/resource/${r.id}`,
    title: r.title,
    label: t.resourceTypes[r.type],
    meta,
    icon: RESOURCE_ICONS[r.type],
    tone: TONE[r.type] ?? "ink",
  });
  const byType = (t: string) => lesson.resources.filter((r) => r.type === t);

  for (const r of byType("PRESENTATION")) tiles.push(res(r, fileMeta(r, t)));
  for (const r of byType("TASK")) tiles.push(res(r, countLabel(parseTasks(r.content).length, t.catalog.tasks)));
  for (const r of byType("CARDS")) tiles.push(res(r, countLabel(parseCards(r.content).length, t.catalog.cards)));
  for (const q of lesson.quizzes) {
    tiles.push({ key: q.id, href: `${base}/quiz/${q.id}`, title: q.title, label: t.lesson.quiz, meta: countLabel(q.questions.length, t.catalog.questions), icon: "ListChecks", tone: "sage" });
  }
  if (lesson.games.length) {
    tiles.push({
      key: "games",
      href: `${base}#games`,
      title: lesson.games.map((g) => g.title).join(" · "),
      label: t.lesson.games,
      meta: countLabel(lesson.games.length, t.catalog.activities),
      icon: "Gamepad2",
      tone: "clay",
    });
  }
  for (const type of ["WORKSHEET", "HOMEWORK", "MAP", "VIDEO", "TEACHER_GUIDE", "DOCUMENT", "ADDITIONAL"]) {
    for (const r of byType(type)) tiles.push(res(r, r.type === "HOMEWORK" && !r.fileUrl ? t.lesson.text : fileMeta(r, t)));
  }
  return tiles;
}
