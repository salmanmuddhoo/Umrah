import { countdown, groupByStage, progress, validatePlan } from './planner';
import type { PlanItem } from './types';

const item = (id: string, stage: string, done = false): PlanItem => ({ id, planId: 'p1', stage, text: `Item ${id}`, done, position: 0 });

describe('groupByStage', () => {
  it('groups in trip order, whatever order the items arrive in', () => {
    const groups = groupByStage([item('a', 'RETURN'), item('b', 'PREPARE'), item('c', 'MAKKAH'), item('d', 'PREPARE')]);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ['Getting ready', ['b', 'd']],
      ['In Makkah', ['c']],
      ['Coming home', ['a']],
    ]);
  });
  it('keeps items with an unknown stage rather than dropping them', () => {
    expect(groupByStage([item('x', 'JEDDAH')])).toEqual([expect.objectContaining({ label: 'Other', items: [expect.objectContaining({ id: 'x' })] })]);
  });
  it('is empty for an empty checklist', () => {
    expect(groupByStage([])).toEqual([]);
  });
});

describe('progress', () => {
  it('is the share done', () => {
    expect(progress(5, 20)).toBe(0.25);
    expect(progress(20, 20)).toBe(1);
  });
  it('is zero for an empty checklist and never leaves 0–1', () => {
    expect(progress(0, 0)).toBe(0);
    expect(progress(7, 5)).toBe(1);
    expect(progress(-1, 5)).toBe(0);
  });
});

describe('countdown', () => {
  const now = Date.parse('2026-11-11T15:30:00Z');
  it.each([
    ['2026-11-23T00:00:00.000Z', null, 'In 12 days'],
    ['2026-11-12T00:00:00.000Z', null, 'Tomorrow'],
    ['2026-11-11T00:00:00.000Z', null, 'Departing today'],
    ['2026-11-05T00:00:00.000Z', '2026-11-15T00:00:00.000Z', 'You are on your trip'],
    ['2026-11-01T00:00:00.000Z', '2026-11-11T00:00:00.000Z', 'You are on your trip'],
    ['2026-10-01T00:00:00.000Z', '2026-10-12T00:00:00.000Z', 'Trip completed'],
    ['2026-10-01T00:00:00.000Z', null, 'Trip completed'],
    [null, null, 'No dates yet'],
    ['not a date', null, 'No dates yet'],
  ])('%s → %s: %s', (depart, back, expected) => {
    expect(countdown(depart, back, now)).toBe(expected);
  });
});

describe('validatePlan', () => {
  const ok = { title: 'Family Umrah', departDate: '2031-03-01', returnDate: '2031-03-12', travellers: '4' };
  it('accepts a full plan, and one with no dates yet', () => {
    expect(validatePlan(ok)).toBeNull();
    expect(validatePlan({ title: 'Umrah one day', departDate: '', returnDate: '', travellers: '' })).toBeNull();
  });
  it.each([
    [{ title: ' ' }, /name/],
    [{ departDate: '01/03/2031' }, /departure date/],
    [{ returnDate: '2031-02-30' }, /return date/],
    [{ returnDate: '2031-02-01' }, /before the departure/],
    [{ travellers: '0' }, /between 1 and 50/],
    [{ travellers: 'four' }, /between 1 and 50/],
  ])('rejects %j', (patch, message) => {
    expect(validatePlan({ ...ok, ...patch })).toMatch(message);
  });
});
