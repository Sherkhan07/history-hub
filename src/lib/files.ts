/** URL under which the app serves a stored object (auth-checked by /api/files). Safe for client code. */
export function fileUrl(key: string | null | undefined): string | null {
  return key ? `/api/files/${key.split("/").map(encodeURIComponent).join("/")}` : null;
}

/** Game/artifact images may also be absolute public paths ("/games/…") or storage keys. */
export function imageSrc(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("/") || value.startsWith("http")) return value;
  return fileUrl(value);
}
