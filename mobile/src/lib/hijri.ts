/**
 * Hijri (Islamic) dates alongside Gregorian ones.
 *
 * The phone's own Umm al-Qura calendar is used when it has one, since that is
 * the calendar Saudi Arabia publishes. Where it is missing, an arithmetic
 * ("tabular") calendar stands in; it can be a day out. Either way the true
 * start of a month depends on the moon being sighted, so the app says so.
 */

export const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  'Rabi‘ al-Awwal',
  'Rabi‘ al-Thani',
  'Jumada al-Ula',
  'Jumada al-Akhirah',
  'Rajab',
  'Sha‘ban',
  'Ramadan',
  'Shawwal',
  'Dhu al-Qa‘dah',
  'Dhu al-Hijjah',
] as const;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export type HijriDate = { day: number; month: number; year: number };

const valid = (h: HijriDate) =>
  Number.isInteger(h.day) && h.day >= 1 && h.day <= 30 && Number.isInteger(h.month) && h.month >= 1 && h.month <= 12 && Number.isInteger(h.year) && h.year > 1300;

/** The Hijri date from the device's Umm al-Qura calendar, or null when the device cannot provide it. */
export function hijriFromIntl(date: Date): HijriDate | null {
  try {
    const format = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
    // Some engines silently fall back to the Gregorian calendar; that must not be shown as Hijri.
    if (format.resolvedOptions().calendar !== 'islamic-umalqura') return null;
    const part = (type: string) => Number(format.formatToParts(date).find((p) => p.type === type)?.value);
    const result = { day: part('day'), month: part('month'), year: part('year') };
    return valid(result) ? result : null;
  } catch {
    return null;
  }
}

/** The Hijri date by the arithmetic civil calendar (30-year cycle), for the local calendar day of `date`. */
export function hijriTabular(date: Date): HijriDate {
  // Julian Day Number of the local Gregorian date.
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn = date.getDate() + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;

  let l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  return { day, month, year: 30 * n + j - 30 };
}

export function toHijri(date: Date): HijriDate {
  return hijriFromIntl(date) ?? hijriTabular(date);
}

/** "12 Jumada al-Ula 1448 AH" */
export function formatHijri(h: HijriDate) {
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} AH`;
}

/** "Wednesday 11 November 2026", in the phone's own time zone. */
export function formatGregorian(date: Date) {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Both calendars for one day, ready to display. */
export function bothCalendars(date: Date) {
  const hijri = toHijri(date);
  return {
    hijri,
    hijriDay: String(hijri.day),
    hijriMonth: HIJRI_MONTHS[hijri.month - 1],
    hijriYear: `${hijri.year} AH`,
    hijriText: formatHijri(hijri),
    gregorianText: formatGregorian(date),
    gregorianMonth: MONTHS[date.getMonth()],
  };
}
