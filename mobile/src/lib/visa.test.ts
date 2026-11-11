import { UMRAH_SECTIONS, parseSection } from './umrah';
import { VISA_GOOD_TO_KNOW, VISA_OFFICIAL_LINKS, VISA_REVIEWED, VISA_ROUTES, VISA_STEPS } from './visa';

describe('visa guide content', () => {
  it('describes each way of getting a visa, with who it is for', () => {
    expect(VISA_ROUTES.map((r) => r.id)).toEqual(['umrah', 'tourist', 'arrival', 'transit', 'gcc']);
    for (const route of VISA_ROUTES) {
      expect(route.title).toBeTruthy();
      expect(route.who).toBeTruthy();
      expect(route.points.length).toBeGreaterThan(0);
    }
  });

  it('walks through the application in order, each step with instructions', () => {
    expect(VISA_STEPS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(VISA_STEPS.map((s) => s.title)).size).toBe(VISA_STEPS.length);
    for (const step of VISA_STEPS) expect(step.points.length).toBeGreaterThan(0);
  });

  it('has no repeated lines, because lines double as list keys', () => {
    const lines = [...VISA_ROUTES.flatMap((r) => r.points), ...VISA_STEPS.flatMap((s) => s.points), ...VISA_GOOD_TO_KNOW];
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('quotes no fees, which change too often to keep correct', () => {
    const text = JSON.stringify([VISA_ROUTES, VISA_STEPS, VISA_GOOD_TO_KNOW]);
    expect(text).not.toMatch(/\$|USD|SAR|riyal/i);
  });

  it('links only to official sites over https, and says when it was last reviewed', () => {
    expect(VISA_OFFICIAL_LINKS.length).toBeGreaterThan(0);
    for (const link of VISA_OFFICIAL_LINKS) expect(link.url).toMatch(/^https:\/\/(www\.nusuk\.sa|visa\.visitsaudi\.com)$/);
    expect(VISA_REVIEWED).toMatch(/\d{4}/);
  });
});

describe('parseSection', () => {
  it('accepts each Umrah section', () => {
    for (const { value } of UMRAH_SECTIONS) expect(parseSection(value)).toBe(value);
  });
  it('falls back to packages for anything else', () => {
    expect(parseSection(undefined)).toBe('packages');
    expect(parseSection('hajj')).toBe('packages');
    expect(parseSection(['visa', 'guide'])).toBe('visa');
  });
});
