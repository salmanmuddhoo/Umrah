/**
 * The Umrah tab keeps two kinds of thing apart: services you book, and guides
 * you read. Each group has its own sections.
 */
export const UMRAH_GROUPS = [
  {
    value: 'services',
    label: 'Services',
    sections: [
      { value: 'packages', label: 'Packages' },
      { value: 'transport', label: 'Transport' },
    ],
  },
  {
    value: 'guides',
    label: 'Guides',
    sections: [
      { value: 'guide', label: 'How to perform Umrah' },
      { value: 'visa', label: 'Visa' },
      { value: 'zamzam', label: 'Zamzam' },
    ],
  },
] as const;

export type UmrahGroup = (typeof UMRAH_GROUPS)[number];
export type UmrahSection = UmrahGroup['sections'][number]['value'];

const ALL_SECTIONS: readonly string[] = UMRAH_GROUPS.flatMap((g) => g.sections.map((s) => s.value));

/** The section named in the route, falling back to Packages for anything unknown. */
export function parseSection(raw: unknown): UmrahSection {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return ALL_SECTIONS.includes(value as string) ? (value as UmrahSection) : 'packages';
}

/** The group a section belongs to. */
export function groupOf(section: UmrahSection): UmrahGroup {
  return UMRAH_GROUPS.find((g) => g.sections.some((s) => s.value === section)) ?? UMRAH_GROUPS[0];
}

/** Where switching to a group lands: its first section. */
export function firstSection(group: string): UmrahSection {
  return (UMRAH_GROUPS.find((g) => g.value === group) ?? UMRAH_GROUPS[0]).sections[0].value;
}
