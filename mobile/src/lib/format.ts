export function money(cents: number) {
  const whole = cents % 100 === 0;
  const amount = (Math.abs(cents) / 100).toFixed(whole ? 0 : 2);
  // Group thousands by hand: Intl currency formatting is not reliable on every Android JS engine.
  const [units, fraction] = amount.split('.');
  const grouped = units.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${cents < 0 ? '-' : ''}$${grouped}${fraction ? `.${fraction}` : ''}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** "15 Dec 2026" — the calendar day in UTC, which is how departure dates are stored. */
export function date(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "YYYY-MM-DD" for pre-filling a date field. */
export function isoDay(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/** Pickup times are always shown in Saudi local time (UTC+3), wherever the phone is. */
export function saudiDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const s = new Date(d.getTime() + 3 * 3_600_000);
  return `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()]} ${s.getUTCFullYear()}, ${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`;
}

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  const units: [number, string][] = [
    [31_536_000, 'y'],
    [2_592_000, 'mo'],
    [86_400, 'd'],
    [3_600, 'h'],
    [60, 'm'],
  ];
  for (const [secs, label] of units) if (s >= secs) return `${Math.floor(s / secs)}${label} ago`;
  return 'just now';
}

/** plural(1, "seat") → "1 seat"; plural(3, "seat") → "3 seats". */
export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}
