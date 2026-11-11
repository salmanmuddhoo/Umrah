import { date, isoDay, money, plural, saudiDateTime, statusLabel, timeAgo } from './format';

describe('money', () => {
  it('drops the cents for whole amounts and groups thousands', () => {
    expect(money(145_000)).toBe('$1,450');
    expect(money(1_060_000)).toBe('$10,600');
    expect(money(7_500)).toBe('$75');
    expect(money(0)).toBe('$0');
  });
  it('keeps two decimals otherwise', () => {
    expect(money(7_550)).toBe('$75.50');
    expect(money(120_350)).toBe('$1,203.50');
    expect(money(5)).toBe('$0.05');
  });
  it('handles negative amounts', () => {
    expect(money(-2_500)).toBe('-$25');
  });
});

describe('date', () => {
  it('formats the UTC calendar day', () => {
    expect(date('2026-12-15T00:00:00.000Z')).toBe('15 Dec 2026');
    expect(date('2027-01-01T00:00:00.000Z')).toBe('1 Jan 2027');
  });
  it('returns an empty string for bad input', () => {
    expect(date('not a date')).toBe('');
  });
});

describe('isoDay', () => {
  it('gives the YYYY-MM-DD form used by date fields', () => {
    expect(isoDay('2026-12-15T00:00:00.000Z')).toBe('2026-12-15');
    expect(isoDay('')).toBe('');
  });
});

describe('saudiDateTime', () => {
  it('shows the time in Saudi Arabia (UTC+3)', () => {
    expect(saudiDateTime('2030-01-05T11:30:00.000Z')).toBe('5 Jan 2030, 14:30');
  });
  it('rolls over to the next day when needed', () => {
    expect(saudiDateTime('2030-12-31T22:15:00.000Z')).toBe('1 Jan 2031, 01:15');
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-11-10T12:00:00.000Z');
  it.each([
    ['2026-11-10T11:59:40.000Z', 'just now'],
    ['2026-11-10T11:45:00.000Z', '15m ago'],
    ['2026-11-10T09:00:00.000Z', '3h ago'],
    ['2026-11-08T12:00:00.000Z', '2d ago'],
    ['2026-09-01T12:00:00.000Z', '2mo ago'],
    ['2024-11-10T12:00:00.000Z', '2y ago'],
  ])('%s → %s', (iso, expected) => {
    expect(timeAgo(iso, now)).toBe(expected);
  });
  it('never shows a time in the future', () => {
    expect(timeAgo('2026-11-10T12:05:00.000Z', now)).toBe('just now');
  });
});

describe('plural / statusLabel', () => {
  it('pluralises by count', () => {
    expect(plural(1, 'seat')).toBe('1 seat');
    expect(plural(0, 'seat')).toBe('0 seats');
    expect(plural(12, 'passenger')).toBe('12 passengers');
  });
  it('turns API statuses into labels', () => {
    expect(statusLabel('CONFIRMED')).toBe('Confirmed');
  });
});
