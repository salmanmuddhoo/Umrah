/** Helpers for reading untrusted input (JSON bodies, form data, query strings). */
export type Input = Record<string, unknown>;
export type FormState = { error?: string; ok?: string } | undefined;

export function fromFormData(fd: FormData): Input {
  const out: Input = {};
  fd.forEach((value, key) => {
    if (typeof value === "string") out[key] = value;
  });
  return out;
}

/** Trimmed string, capped at `max` characters. Numbers are accepted and stringified. */
export function str(input: Input, key: string, max = 5000) {
  const v = input[key];
  if (typeof v === "string") return v.trim().slice(0, max);
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

/** Integer field, or NaN when missing/invalid. */
export function int(input: Input, key: string) {
  const v = str(input, key);
  return /^-?\d+$/.test(v) ? Number(v) : NaN;
}

/** A money amount given in whole currency units ("12.50"), returned in cents (NaN when invalid). */
export function cents(input: Input, key: string) {
  const v = str(input, key);
  return /^\d+(\.\d{1,2})?$/.test(v) ? Math.round(Number(v) * 100) : NaN;
}

/** True for JSON `true` and for the "on"/"true" strings HTML forms send. */
export function bool(input: Input, key: string) {
  const v = input[key];
  return v === true || v === "on" || v === "true";
}

export function between(n: number, min: number, max: number) {
  return Number.isInteger(n) && n >= min && n <= max;
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isPhone = (v: string) => /^[+\d][\d\s()-]{5,30}$/.test(v);

/** "YYYY-MM-DD" as midnight UTC, or null. Rejects impossible dates such as 2026-02-31. */
export function parseDay(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v) ? d : null;
}

/**
 * "YYYY-MM-DDTHH:mm" entered as Saudi local time (UTC+3, no daylight saving), or null.
 * Pickups always happen in Saudi Arabia, so the traveller's own time zone is irrelevant.
 */
export function parseSaudiDateTime(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) || !parseDay(v.slice(0, 10))) return null;
  const d = new Date(`${v}:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
