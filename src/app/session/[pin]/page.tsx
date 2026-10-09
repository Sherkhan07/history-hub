import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n";
import { ParticipantScreen } from "@/features/sessions/components/participant-screen";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).lesson.gameTitle };
}

export default async function SessionPage({ params }: PageProps<"/session/[pin]">) {
  const { pin } = await params;
  if (!/^\d{6}$/.test(pin)) notFound();
  return <ParticipantScreen pin={pin} />;
}
