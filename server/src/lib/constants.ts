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

export const AD_THEMES = ["green", "gold", "night"] as const;
