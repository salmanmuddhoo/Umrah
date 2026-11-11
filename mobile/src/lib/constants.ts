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

/**
 * The kinds of service a business can apply to provide. Mirrors PROVIDER_TYPES
 * on the server; `listings` says which listing tools that kind has in the app today.
 */
export const PROVIDER_TYPES = [
  { value: 'UMRAH', label: 'Umrah packages', description: 'Sell Umrah packages with hotels, flights and visas.', icon: 'airplane', listings: 'packages' },
  { value: 'TRANSPORT', label: 'Transport', description: 'Offer airport transfers, intercity rides and ziyarah tours.', icon: 'car', listings: 'services' },
  { value: 'ACCOMMODATION', label: 'Hotels & accommodation', description: 'Rent rooms or apartments in Makkah and Madinah.', icon: 'bed', listings: null },
  { value: 'CATERING', label: 'Food & catering', description: 'Provide meals for groups and families.', icon: 'restaurant', listings: null },
  { value: 'GUIDE', label: 'Guides & ziyarah', description: 'Guide pilgrims through the rites or lead ziyarah visits.', icon: 'compass', listings: null },
  { value: 'OTHER', label: 'Other services', description: 'Anything else pilgrims need: SIM cards, wheelchairs, luggage, gifts.', icon: 'briefcase', listings: null },
] as const;

export const providerType = (value: string | undefined | null) => PROVIDER_TYPES.find((t) => t.value === String(value ?? '').toUpperCase()) ?? null;
export const providerTypeLabel = (value: string) => providerType(value)?.label ?? value;
