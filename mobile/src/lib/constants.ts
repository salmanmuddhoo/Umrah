export const TOPICS = [
  { slug: 'general', label: 'General' },
  { slug: 'first-timers', label: 'First-timers' },
  { slug: 'rituals', label: 'Rituals & fiqh' },
  { slug: 'travel', label: 'Travel & visas' },
  { slug: 'hotels', label: 'Hotels & food' },
  { slug: 'reviews', label: 'Provider reviews' },
  { slug: 'companions', label: 'Travel companions' },
] as const;

export const VEHICLE_TYPES = [
  { value: 'SEDAN', label: 'Sedan' },
  { value: 'SUV', label: 'SUV' },
  { value: 'VAN', label: 'Van / minibus' },
  { value: 'BUS', label: 'Coach bus' },
] as const;

export const topicLabel = (slug: string) => TOPICS.find((t) => t.slug === slug)?.label ?? slug;
export const vehicleLabel = (value: string) => VEHICLE_TYPES.find((v) => v.value === value)?.label ?? value;

export const INCLUSIONS = [
  ['incFlights', 'Flights'],
  ['incVisa', 'Visa'],
  ['incMeals', 'Meals'],
  ['incTransport', 'Ground transport'],
  ['incZiyarah', 'Ziyarah tours'],
] as const;

/** Labels of everything a package's price includes. */
export function inclusions(pkg: Record<(typeof INCLUSIONS)[number][0], boolean>) {
  return INCLUSIONS.filter(([key]) => pkg[key]).map(([, label]) => label);
}
