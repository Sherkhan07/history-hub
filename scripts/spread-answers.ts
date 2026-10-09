/**
 * One-off fix for an existing database: demo questions and game items were seeded with the correct answer
 * as the first option. This moves it to a stable pseudo-random position (same rule as the seed, see
 * prisma/data/spread.ts). Only choices whose correct answer is first are touched; re-running changes nothing.
 *
 *   npm run answers:spread
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { spreadCorrect, spreadGameItem } from "../prisma/data/spread";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  let questions = 0;
  const rows = await db.question.findMany({ where: { type: "SINGLE_CHOICE" }, include: { options: { orderBy: { sortOrder: "asc" } } } });
  for (const q of rows) {
    const correct = q.options.findIndex((o) => o.isCorrect);
    if (correct !== 0 || q.options.length < 3) continue;
    const spread = spreadCorrect(q.options, correct, q.prompt);
    if (spread.correct === 0) continue;
    await db.$transaction(spread.options.map((o, i) => db.answerOption.update({ where: { id: o.id }, data: { sortOrder: i } })));
    questions++;
  }

  let items = 0;
  for (const it of await db.gameItem.findMany()) {
    const before = JSON.stringify(it.data);
    const after = spreadGameItem(it.data);
    if (JSON.stringify(after) === before) continue;
    await db.gameItem.update({ where: { id: it.id }, data: { data: after as Prisma.InputJsonValue } });
    items++;
  }
  console.log(`Spread correct answers: ${questions} quiz questions, ${items} game items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
