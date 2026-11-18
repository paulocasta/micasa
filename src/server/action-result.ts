export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export const ok = (message?: string): ActionResult => ({ ok: true, message });
export const fail = (error: string): ActionResult => ({ ok: false, error });

export function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return v == null ? "" : String(v).trim();
}

export function optInt(fd: FormData, key: string) {
  const v = str(fd, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function num(fd: FormData, key: string, fallback = 0) {
  const v = str(fd, key).replace(",", ".");
  const n = Number(v);
  return v && Number.isFinite(n) ? n : fallback;
}
