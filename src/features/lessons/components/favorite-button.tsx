"use client";

import { useOptimistic, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDict } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "../actions";

export function FavoriteButton({ lessonId, initial, size = "lg", iconOnly }: { lessonId: string; initial: boolean; size?: "lg" | "default" | "icon"; iconOnly?: boolean }) {
  const t = useDict();
  const [fav, setFav] = useOptimistic(initial);
  const [, start] = useTransition();

  const toggle = () =>
    start(async () => {
      setFav(!fav);
      const res = await toggleFavoriteAction(lessonId);
      if (!res.ok) toast.error(res.error);
      else toast.success(res.data?.favorite ? t.lesson.favAdded : t.lesson.favRemoved);
    });

  return (
    <Button
      type="button"
      variant="outline"
      size={iconOnly ? "icon" : size}
      onClick={toggle}
      aria-pressed={fav}
      aria-label={fav ? t.lesson.inFavorites : t.lesson.addFavorite}
      className={cn(fav && "border-gold/60 bg-gold-soft text-[oklch(0.45_0.1_70)] hover:bg-gold-soft")}
    >
      <Star className={cn(fav && "fill-gold text-gold")} />
      {!iconOnly && (fav ? t.lesson.inFavorites : t.lesson.addFavorite)}
    </Button>
  );
}
