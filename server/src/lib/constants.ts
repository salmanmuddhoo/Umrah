export const ROLES = ["PILGRIM", "PROVIDER", "TRANSPORT", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Bookings in these states earn the platform its commission. */
export const EARNING_STATUSES = ["CONFIRMED", "COMPLETED"];

export const VEHICLE_TYPES = ["SEDAN", "SUV", "VAN", "BUS"] as const;
export const VEHICLE_LABELS: Record<string, string> = {
  SEDAN: "Sedan",
  SUV: "SUV",
  VAN: "Van / minibus",
  BUS: "Coach bus",
};

export const TOPICS = [
  { slug: "general", label: "General" },
  { slug: "first-timers", label: "First-timers" },
  { slug: "rituals", label: "Rituals & fiqh" },
  { slug: "travel", label: "Travel & visas" },
  { slug: "hotels", label: "Hotels & food" },
  { slug: "reviews", label: "Provider reviews" },
  { slug: "companions", label: "Travel companions" },
] as const;

export const DEFAULT_COMMISSION = { package: 8, transport: 10 };

export const AD_THEMES = ["brand", "gold", "night"] as const;

/**
 * The kinds of business that can apply to sell through the app. To add one,
 * add a line here. `listings` says which listing tools that kind of provider
 * gets in the app today; null means they can register and be approved, and
 * their listing tools come later.
 */
export const PROVIDER_TYPES = [
  { value: "UMRAH", label: "Umrah packages", description: "Sell Umrah packages with hotels, flights and visas.", listings: "packages" },
  { value: "TRANSPORT", label: "Transport", description: "Offer airport transfers, intercity rides and ziyarah tours.", listings: "services" },
  { value: "ACCOMMODATION", label: "Hotels & accommodation", description: "Rent rooms or apartments in Makkah and Madinah.", listings: null },
  { value: "CATERING", label: "Food & catering", description: "Provide meals for groups and families.", listings: null },
  { value: "GUIDE", label: "Guides & ziyarah", description: "Guide pilgrims through the rites or lead ziyarah visits.", listings: null },
  { value: "OTHER", label: "Other services", description: "Anything else pilgrims need: SIM cards, wheelchairs, luggage, gifts.", listings: null },
] as const;

export type ProviderTypeValue = (typeof PROVIDER_TYPES)[number]["value"];
export const providerTypeLabel = (value: string) => PROVIDER_TYPES.find((t) => t.value === value)?.label ?? value;

/** Reads a provider type from user input, case-insensitively. Null when it is not one. */
export function parseProviderType(raw: string): ProviderTypeValue | null {
  return PROVIDER_TYPES.find((t) => t.value === raw.trim().toUpperCase())?.value ?? null;
}

/**
 * Prices quoted in the app's guides. They change, so each is a short piece of
 * text the admin can edit in the console (stored under `price.<key>` settings);
 * these are the values used until they do.
 */
export const GUIDE_PRICES = [
  { key: "zamzam", label: "Zamzam water at the airport", fallback: "SAR 12.50 for one 5-litre bottle" },
  { key: "visa.umrah", label: "Umrah visa", fallback: "Varies by country and agent; usually included in the price of a package" },
  { key: "visa.tourist", label: "Tourist e-visa", fallback: "About SAR 535, including medical insurance" },
  { key: "visa.arrival", label: "Visa on arrival", fallback: "About SAR 480, including medical insurance" },
  { key: "visa.transit", label: "Stopover (transit) visa", fallback: "Set by the airline's stopover programme; shown when you book the flight" },
  { key: "visa.gcc", label: "GCC resident visa", fallback: "About SAR 300, plus medical insurance" },
  { key: "reviewed", label: "Prices last checked (shown to readers)", fallback: "November 2026" },
] as const;

export const PLAN_STAGES = [
  { value: "PREPARE", label: "Getting ready" },
  { value: "BEFORE_TRAVEL", label: "Before you fly" },
  { value: "MAKKAH", label: "In Makkah" },
  { value: "MADINAH", label: "In Madinah" },
  { value: "RETURN", label: "Coming home" },
] as const;

/** The checklist every new plan starts with. People can tick, edit, add to and remove from it. */
export const PLAN_TEMPLATE: [stage: (typeof PLAN_STAGES)[number]["value"], text: string][] = [
  ["PREPARE", "Check my passport is valid for at least six months"],
  ["PREPARE", "Decide who is travelling and agree a budget"],
  ["PREPARE", "Choose and book an Umrah package or hotels"],
  ["PREPARE", "Apply for the visa"],
  ["PREPARE", "Get the meningitis (ACWY) vaccination"],
  ["PREPARE", "Learn the rites of Umrah"],
  ["BEFORE_TRAVEL", "Book airport and intercity transport"],
  ["BEFORE_TRAVEL", "Install Nusuk and book the Umrah permit"],
  ["BEFORE_TRAVEL", "Book a Rawdah visit time in Nusuk"],
  ["BEFORE_TRAVEL", "Pack ihram, unscented toiletries and comfortable sandals"],
  ["BEFORE_TRAVEL", "Print copies of passport, visa and bookings"],
  ["MAKKAH", "Enter ihram and make the intention at the miqat"],
  ["MAKKAH", "Perform tawaf and pray two rak\u2018ahs"],
  ["MAKKAH", "Perform sa\u2018i between Safa and Marwah"],
  ["MAKKAH", "Shave or trim hair to complete Umrah"],
  ["MADINAH", "Pray in the Prophet\u2019s Mosque and visit the Rawdah"],
  ["MADINAH", "Visit Quba Mosque and Uhud"],
  ["RETURN", "Buy Zamzam water at the airport"],
  ["RETURN", "Check out and confirm the ride to the airport"],
];
