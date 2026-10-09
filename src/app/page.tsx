import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { homePathFor } from "@/server/auth/permissions";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? homePathFor(user.role) : "/login");
}
