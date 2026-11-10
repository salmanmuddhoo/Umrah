export type FormState = { error?: string; ok?: string } | undefined;

export function str(fd: FormData, key: string, max = 5000) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Integer field, or NaN when missing/invalid. */
export function int(fd: FormData, key: string) {
  const v = str(fd, key);
  return /^-?\d+$/.test(v) ? Number(v) : NaN;
}

/** A money amount typed in dollars, returned in cents (NaN when invalid). */
export function cents(fd: FormData, key: string) {
  const v = str(fd, key);
  return /^\d+(\.\d{1,2})?$/.test(v) ? Math.round(Number(v) * 100) : NaN;
}

export function between(n: number, min: number, max: number) {
  return Number.isInteger(n) && n >= min && n <= max;
}
