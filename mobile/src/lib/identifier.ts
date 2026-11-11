/** Email addresses and phone numbers people sign in with. Mirrors server/src/lib/identifier.ts. */

export type Identifier =
  | { kind: "email"; value: string }
  | { kind: "phone"; value: string };

/**
 * Reads what someone typed as an email address or an international phone number.
 * Phones are normalised to E.164 ('+447700900123'); a leading '00' is accepted as '+'.
 * Returns null when it is neither.
 */
export function parseIdentifier(raw: unknown): Identifier | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (text.includes("@")) {
    const email = text.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200
      ? { kind: "email", value: email }
      : null;
  }
  let digits = text.replace(/[\s().-]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  // E.164: a plus, a non-zero country code digit, 8–15 digits in total.
  return /^\+[1-9]\d{7,14}$/.test(digits)
    ? { kind: "phone", value: digits }
    : null;
}

/** 'a•••@example.com' / '+44•••••0123' — enough to recognise, not enough to leak. */
export function maskIdentifier(id: Identifier) {
  if (id.kind === "email") {
    const [local, domain] = id.value.split("@");
    return `${local.slice(0, 1)}•••@${domain}`;
  }
  return `${id.value.slice(0, 3)}${"•".repeat(Math.max(0, id.value.length - 7))}${id.value.slice(-4)}`;
}

export const isPin = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}$/.test(v);
