import { bothCalendars, formatGregorian, formatHijri, hijriFromIntl, hijriTabular, HIJRI_MONTHS, toHijri } from './hijri';

/** Local noon, so the calendar day is the same in every time zone the tests might run in. */
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

/** The same date according to the JavaScript engine's own calendar data. */
function reference(calendar: string, date: Date) {
  const parts = new Intl.DateTimeFormat(`en-u-ca-${calendar}-nu-latn`, { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(date);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { day: n('day'), month: n('month'), year: n('year') };
}

describe('hijriTabular', () => {
  it('matches the civil Islamic calendar on every day across several years', () => {
    const mismatches: string[] = [];
    for (let i = 0; i < 2200; i++) {
      const date = new Date(2024, 0, 1 + i, 12);
      const expected = reference('islamic-civil', date);
      const actual = hijriTabular(date);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) mismatches.push(date.toDateString());
    }
    expect(mismatches).toEqual([]);
  });

  it('starts counting from the Hijrah: 1 Muharram 1 AH is 19 July 622 in the Gregorian calendar', () => {
    expect(hijriTabular(new Date(622, 6, 19, 12))).toEqual({ day: 1, month: 1, year: 1 });
    expect(hijriTabular(new Date(622, 6, 18, 12)).year).toBe(0);
  });

  it('rolls over months and years one day at a time', () => {
    expect(hijriTabular(day(1979, 11, 20))).toEqual({ day: 29, month: 12, year: 1399 });
    expect(hijriTabular(day(1979, 11, 21))).toEqual({ day: 1, month: 1, year: 1400 });
  });
});

describe('hijriFromIntl / toHijri', () => {
  it("uses the device's Umm al-Qura calendar when it has one", () => {
    const date = day(2026, 11, 11);
    expect(hijriFromIntl(date)).toEqual(reference('islamic-umalqura', date));
    expect(toHijri(date)).toEqual(reference('islamic-umalqura', date));
  });

  it('is never more than a day or two from the arithmetic calendar', () => {
    for (let i = 0; i < 800; i += 7) {
      const date = new Date(2026, 0, 1 + i, 12);
      const a = toHijri(date);
      const b = hijriTabular(date);
      const days = (h: { day: number; month: number; year: number }) => h.year * 354.367 + (h.month - 1) * 29.53 + h.day;
      expect(Math.abs(days(a) - days(b))).toBeLessThanOrEqual(2);
    }
  });

  describe('on a device without Islamic calendar data', () => {
    const original = Intl.DateTimeFormat;
    afterEach(() => {
      Intl.DateTimeFormat = original;
    });

    it('falls back to the arithmetic calendar when Intl throws', () => {
      Intl.DateTimeFormat = jest.fn(() => {
        throw new RangeError('unsupported calendar');
      }) as never;
      const date = day(2026, 11, 11);
      expect(hijriFromIntl(date)).toBeNull();
      expect(toHijri(date)).toEqual(hijriTabular(date));
    });

    it('does not present a silent Gregorian fallback as a Hijri date', () => {
      Intl.DateTimeFormat = jest.fn((_locale: string, options: Intl.DateTimeFormatOptions) => new original('en', options)) as never;
      const date = day(2026, 11, 11);
      expect(hijriFromIntl(date)).toBeNull();
      expect(toHijri(date).year).toBeGreaterThan(1440);
      expect(toHijri(date).year).toBeLessThan(1500);
    });
  });
});

describe('formatting', () => {
  it('names all twelve months', () => {
    expect(HIJRI_MONTHS).toHaveLength(12);
    expect(new Set(HIJRI_MONTHS).size).toBe(12);
    expect(formatHijri({ day: 1, month: 9, year: 1448 })).toBe('1 Ramadan 1448 AH');
    expect(formatHijri({ day: 10, month: 12, year: 1447 })).toBe('10 Dhu al-Hijjah 1447 AH');
  });

  it('writes the Gregorian date with weekday and month name', () => {
    expect(formatGregorian(day(2026, 11, 11))).toBe('Wednesday 11 November 2026');
    expect(formatGregorian(day(2027, 1, 1))).toBe('Friday 1 January 2027');
  });

  it('gives both calendars for display', () => {
    const both = bothCalendars(day(2026, 11, 11));
    expect(both.gregorianText).toBe('Wednesday 11 November 2026');
    expect(both.gregorianMonth).toBe('November');
    expect(both.hijriText).toBe(`${both.hijriDay} ${both.hijriMonth} ${both.hijriYear}`);
    expect(HIJRI_MONTHS).toContain(both.hijriMonth);
  });
});
