import { requireRole } from "@/server/auth/guards";

/** Teacher area is readable by every role (staff use it to preview what teachers see). */
export default async function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  await requireRole("TEACHER", "MODERATOR", "ADMIN");
  return children;
}
