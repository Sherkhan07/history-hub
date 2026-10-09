/**
 * Route smoke test for all three roles (and anonymous).
 * Creates short-lived sessions for the seeded demo users, requests every page and asserts the
 * expected outcome (200 / redirect to own home / redirect to login / 404). Run against a running
 * server:  npm run smoke   (BASE_URL defaults to http://localhost:3000)
 */
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

type Expect = "ok" | "login" | "home" | "404" | "401" | "403";
type Role = "ADMIN" | "MODERATOR" | "TEACHER" | "ANON";

async function main() {
  const lesson = await db.lesson.findFirstOrThrow({ where: { status: "PUBLISHED" }, include: { resources: true, quizzes: true, games: true } });
  const draft = await db.lesson.findFirst({ where: { status: "DRAFT" } });
  const file = lesson.resources.find((r) => r.fileUrl)!;
  const L = `/teacher/lesson/${lesson.id}`;

  const pages: { path: string; expect: Record<Role, Expect> }[] = [
    ...["/teacher", "/teacher/subjects?grade=5", "/teacher/subject/history-kz/grade/5", L, `${L}/present`, `${L}/resource/${file.id}`, `${L}/quiz/${lesson.quizzes[0]?.id}`, `${L}/game/${lesson.games[0]?.id}`, "/teacher/favorites", "/teacher/recent", "/teacher/search?q=тас"].map((path) => ({
      path,
      expect: { ADMIN: "ok", MODERATOR: "ok", TEACHER: "ok", ANON: "login" } as Record<Role, Expect>,
    })),
    ...(draft ? [{ path: `/teacher/lesson/${draft.id}`, expect: { ADMIN: "ok", MODERATOR: "ok", TEACHER: "404", ANON: "login" } as Record<Role, Expect> }] : []),
    ...["/moderator", "/moderator/lessons", "/moderator/lessons/new", `/moderator/lessons/${lesson.id}/edit`, `/moderator/lessons/${lesson.id}/edit?tab=quiz`, `/moderator/lessons/${lesson.id}/edit?tab=games`, `/moderator/lessons/${lesson.id}/edit?tab=scenario`, `/moderator/lessons/${lesson.id}/edit?tab=history`, "/moderator/review", "/moderator/media"].map((path) => ({
      path,
      expect: { ADMIN: "ok", MODERATOR: "ok", TEACHER: "home", ANON: "login" } as Record<Role, Expect>,
    })),
    ...["/admin", "/admin/users", "/admin/content", "/admin/subjects", "/admin/grades", "/admin/curriculum", "/admin/lessons", "/admin/resources", "/admin/games", "/admin/moderation", "/admin/analytics", "/admin/audit-log", "/admin/settings"].map((path) => ({
      path,
      expect: { ADMIN: "ok", MODERATOR: "home", TEACHER: "home", ANON: "login" } as Record<Role, Expect>,
    })),
    { path: `/api/files/${file.fileUrl}`, expect: { ADMIN: "ok", MODERATOR: "ok", TEACHER: "ok", ANON: "401" } },
    { path: `/api/lessons/${lesson.id}/download`, expect: { ADMIN: "ok", MODERATOR: "ok", TEACHER: "ok", ANON: "401" } },
    { path: "/join", expect: { ADMIN: "ok", MODERATOR: "ok", TEACHER: "ok", ANON: "ok" } },
    { path: "/login", expect: { ADMIN: "home", MODERATOR: "home", TEACHER: "home", ANON: "ok" } },
  ];

  const tokens: Partial<Record<Role, string>> = {};
  const created: string[] = [];
  for (const role of ["ADMIN", "MODERATOR", "TEACHER"] as const) {
    const user = await db.user.findFirstOrThrow({ where: { role, isBlocked: false }, orderBy: { createdAt: "asc" } });
    const token = randomBytes(32).toString("base64url");
    const s = await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 10 * 60_000) } });
    created.push(s.id);
    tokens[role] = token;
  }
  const home: Record<Role, string> = { ADMIN: "/admin", MODERATOR: "/moderator", TEACHER: "/teacher", ANON: "/login" };

  let failures = 0;
  try {
    for (const role of ["ADMIN", "MODERATOR", "TEACHER", "ANON"] as Role[]) {
      for (const p of pages) {
        const res = await fetch(BASE + p.path, { redirect: "manual", headers: tokens[role as Exclude<Role, "ANON">] ? { cookie: `hh_session=${tokens[role as Exclude<Role, "ANON">]}` } : {} });
        const loc = res.headers.get("location") ?? "";
        let got: Expect | string = String(res.status);
        if (res.status === 200 || res.status === 206) got = "ok";
        else if (res.status >= 300 && res.status < 400) got = loc.includes("/login") ? "login" : loc.endsWith(home[role]) || loc.includes(`${home[role]}?`) ? "home" : `redirect:${loc}`;
        else if (res.status === 404) got = "404";
        // Next renders notFound() inside an already-streamed layout with status 200 in dev; detect the 404 page body
        const contentType = res.headers.get("content-type") ?? "";
        if (got === "ok" && contentType.includes("text/html")) {
          const body = await res.text();
          // The dictionary is serialized into every page, so match the rendered <h1> only
          if (body.includes("NEXT_HTTP_ERROR_FALLBACK;404")) got = "404";
          // A page that rendered the error boundary still answers 200 — treat it as a failure
          else if (/"digest":"\d+"/.test(body) || body.includes("cannot be passed directly to Client Components")) got = "error-boundary";
        } else await res.body?.cancel();
        const ok = got === p.expect[role];
        if (!ok) failures++;
        console.log(`${ok ? "✓" : "✗"} ${role.padEnd(9)} ${p.path.padEnd(70).slice(0, 70)} expected ${p.expect[role]}, got ${got}`);
      }
    }

    // Mutations: RBAC + CSRF on route handlers
    const form = () => {
      const f = new FormData();
      f.append("file", new Blob(["%PDF-1.4 test"], { type: "application/pdf" }), "x.pdf");
      return f;
    };
    const mutations: { name: string; run: () => Promise<Response>; expect: number }[] = [
      { name: "TEACHER upload material", run: () => fetch(`${BASE}/api/lessons/${lesson.id}/resources`, { method: "POST", body: form(), headers: { cookie: `hh_session=${tokens.TEACHER}` } }), expect: 403 },
      { name: "ANON upload material", run: () => fetch(`${BASE}/api/lessons/${lesson.id}/resources`, { method: "POST", body: form() }), expect: 403 },
      { name: "MODERATOR upload to published lesson", run: () => fetch(`${BASE}/api/lessons/${lesson.id}/resources`, { method: "POST", body: form(), headers: { cookie: `hh_session=${tokens.MODERATOR}` } }), expect: 409 },
      { name: "TEACHER upload game image", run: () => fetch(`${BASE}/api/uploads/image`, { method: "POST", body: form(), headers: { cookie: `hh_session=${tokens.TEACHER}` } }), expect: 403 },
      { name: "cross-site join (CSRF)", run: () => fetch(`${BASE}/api/play/join`, { method: "POST", body: JSON.stringify({ pin: "123456", name: "X" }), headers: { "content-type": "application/json", origin: "https://evil.example" } }), expect: 403 },
      { name: "join with unknown PIN", run: () => fetch(`${BASE}/api/play/join`, { method: "POST", body: JSON.stringify({ pin: "000001", name: "Тест" }), headers: { "content-type": "application/json" } }), expect: 400 },
      { name: "ANON host state", run: () => fetch(`${BASE}/api/sessions/x/state`), expect: 401 },
    ];
    for (const m of mutations) {
      const res = await m.run();
      await res.body?.cancel();
      const ok = res.status === m.expect;
      if (!ok) failures++;
      console.log(`${ok ? "✓" : "✗"} API       ${m.name.padEnd(70)} expected ${m.expect}, got ${res.status}`);
    }
  } finally {
    await db.session.deleteMany({ where: { id: { in: created } } });
    await db.$disconnect();
  }
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll route checks passed");
  process.exit(failures ? 1 : 0);
}

void main();
