/** Business rules with no I/O, so they can be unit-tested directly. */

export function commissionOn(totalCents: number, pct: number) {
  return Math.round((totalCents * pct) / 100);
}

export function validRate(n: number, max = 100) {
  return Number.isFinite(n) && n >= 0 && n <= max;
}

/**
 * Allowed booking status moves. The customer may only cancel; the provider
 * confirms or declines a request, then completes or cancels a confirmed one.
 */
export function canMove(from: string, to: string, actor: "customer" | "provider") {
  if (actor === "customer") return to === "CANCELLED" && (from === "PENDING" || from === "CONFIRMED");
  if (from === "PENDING") return to === "CONFIRMED" || to === "CANCELLED";
  if (from === "CONFIRMED") return to === "COMPLETED" || to === "CANCELLED";
  return false;
}

export function seatsLeft(seatsTotal: number, booked: number) {
  return Math.max(0, seatsTotal - booked);
}

/** Only follow same-site relative redirects. */
export function safeNext(next: string, fallback: string) {
  return next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}

/** Account role for someone registering as a provider of the given type (null = pilgrim). */
export function roleForProviderType(type: string | null) {
  return type === null ? "PILGRIM" : type === "TRANSPORT" ? "TRANSPORT" : "PROVIDER";
}
