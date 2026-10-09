"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDict } from "@/i18n/provider";

export function JoinForm({ initialPin }: { initialPin?: string }) {
  const t = useDict();
  const router = useRouter();
  const [pin, setPin] = useState(initialPin ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const r = await fetch("/api/play/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: pin.replace(/\D/g, ""), name }) });
      const body = await r.json();
      if (!r.ok) setError(body.error ?? t.session.joinFailed);
      else router.push(`/session/${body.pin}`);
    } catch {
      setError(t.session.noConnection);
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="pin" className="text-base">{t.session.pin}</Label>
        <Input
          id="pin"
          inputMode="numeric"
          autoComplete="off"
          maxLength={7}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^\d ]/g, ""))}
          className="h-16 text-center font-heading text-3xl tracking-[0.3em]"
          placeholder="000000"
          required
          autoFocus={!initialPin}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name" className="text-base">{t.session.yourName}</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} className="h-14 text-lg" placeholder={t.session.namePlaceholder} required autoFocus={Boolean(initialPin)} autoComplete="given-name" />
      </div>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-destructive">{error}</p>}
      <Button type="submit" size="xl" className="w-full" disabled={pending || pin.replace(/\D/g, "").length !== 6 || name.trim().length < 2}>
        {pending && <Loader2 className="animate-spin" />} {t.session.join}
      </Button>
    </form>
  );
}
