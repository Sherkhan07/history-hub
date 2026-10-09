/**
 * Adds the 5th-grade textbook topic list and book quiz questions to an existing database.
 * Safe to re-run: existing lessons and questions are left as they are.
 *
 *   npm run textbook:import
 */
import "dotenv/config";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { importTextbook } from "../prisma/textbook-import";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

importTextbook(db, { materialsDir: path.resolve(process.cwd(), process.env.MATERIALS_DIR ?? "..") })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
