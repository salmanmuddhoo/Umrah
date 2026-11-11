import type { PlanItem } from './types';

/** The parts of a trip a checklist is grouped by. Mirrors PLAN_STAGES on the server. */
export const PLAN_STAGES = [
  { value: 'PREPARE', label: 'Getting ready' },
  { value: 'BEFORE_TRAVEL', label: 'Before you fly' },
  { value: 'MAKKAH', label: 'In Makkah' },
  { value: 'MADINAH', label: 'In Madinah' },
  { value: 'RETURN', label: 'Coming home' },
] as const;

/** Items grouped by stage, in trip order. Stages with nothing in them are left out; unknown stages go last. */
export function groupByStage(items: PlanItem[]) {
  const known = PLAN_STAGES.map((stage) => ({ ...stage, items: items.filter((i) => i.stage === stage.value) }));
  const other = items.filter((i) => !PLAN_STAGES.some((s) => s.value === i.stage));
  return [...known, { value: 'OTHER', label: 'Other', items: other }].filter((group) => group.items.length > 0);
}

/** Share of the checklist that is done, from 0 to 1. An empty list counts as nothing done. */
export function progress(done: number, total: number) {
  return total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
}

const DAY = 86_400_000;
const startOfDayUtc = (ms: number) => Math.floor(ms / DAY) * DAY;

/**
 * A plain-language countdown to the trip, e.g. "In 12 days", "Tomorrow", "You are on your trip".
 * Trip dates are stored as UTC calendar days.
 */
export function countdown(departIso: string | null, returnIso: string | null, now: number) {
  if (!departIso) return 'No dates yet';
  const today = startOfDayUtc(now);
  const depart = startOfDayUtc(new Date(departIso).getTime());
  if (Number.isNaN(depart)) return 'No dates yet';
  const days = Math.round((depart - today) / DAY);
  if (days > 1) return `In ${days} days`;
  if (days === 1) return 'Tomorrow';
  if (days === 0) return 'Departing today';
  const back = returnIso ? startOfDayUtc(new Date(returnIso).getTime()) : NaN;
  if (!Number.isNaN(back) && today <= back) return 'You are on your trip';
  return 'Trip completed';
}

/** Checks the trip form before it is sent. Returns an error message or null. */
export function validatePlan(f: { title: string; departDate: string; returnDate: string; travellers: string }) {
  const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);
  if (f.title.trim().length < 2) return 'Give your plan a name.';
  if (f.departDate && !isDay(f.departDate)) return 'Enter the departure date as YYYY-MM-DD.';
  if (f.returnDate && !isDay(f.returnDate)) return 'Enter the return date as YYYY-MM-DD.';
  if (f.departDate && f.returnDate && f.returnDate < f.departDate) return 'The return date is before the departure date.';
  if (f.travellers && (!/^\d+$/.test(f.travellers) || Number(f.travellers) < 1 || Number(f.travellers) > 50)) return 'Travellers must be between 1 and 50.';
  return null;
}
