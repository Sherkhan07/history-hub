import "server-only";
import { revalidateTag } from "next/cache";

export const CATALOG_TAG = "catalog";
export const lessonTag = (id: string) => `lesson:${id}`;

/** Expire the published catalog immediately (used after publish/unpublish/archive or edits to live lessons). */
export function invalidateCatalog(lessonId?: string) {
  revalidateTag(CATALOG_TAG, { expire: 0 });
  if (lessonId) revalidateTag(lessonTag(lessonId), { expire: 0 });
}
