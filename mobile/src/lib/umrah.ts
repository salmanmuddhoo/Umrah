/** The sections inside the Umrah tab. */
export const UMRAH_SECTIONS = [
  { value: 'packages', label: 'Packages' },
  { value: 'transport', label: 'Transport' },
  { value: 'guide', label: 'How to perform' },
  { value: 'visa', label: 'Visa' },
] as const;

export type UmrahSection = (typeof UMRAH_SECTIONS)[number]['value'];

/** The section named in the route, falling back to Packages for anything unknown. */
export function parseSection(raw: unknown): UmrahSection {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return UMRAH_SECTIONS.some((s) => s.value === value) ? (value as UmrahSection) : 'packages';
}
