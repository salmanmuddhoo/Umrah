import { CHECKLIST, IHRAM_RESTRICTIONS, MIQATS, PREPARATION, STEPS } from './guide';

describe('Umrah guide content', () => {
  it('covers the rites in the order they are performed', () => {
    expect(STEPS.map((s) => s.id)).toEqual(['ihram', 'tawaf', 'prayer', 'sai', 'halq']);
  });
  it('gives every step a title, a summary and instructions', () => {
    for (const step of STEPS) {
      expect(step.title).toBeTruthy();
      expect(step.summary).toBeTruthy();
      expect(step.points.length).toBeGreaterThan(0);
      expect(new Set(step.points).size).toBe(step.points.length); // points double as list keys
    }
  });
  it('gives every supplication Arabic text, a transliteration and a meaning', () => {
    const duas = STEPS.flatMap((s) => s.duas ?? []);
    expect(duas.length).toBeGreaterThanOrEqual(3);
    for (const dua of duas) {
      expect(dua.arabic).toMatch(/[؀-ۿ]/);
      expect(dua.translit).toBeTruthy();
      expect(dua.meaning).toBeTruthy();
      expect(dua.when).toBeTruthy();
    }
  });
  it('includes the Talbiyah in the ihram step', () => {
    const ihram = STEPS.find((s) => s.id === 'ihram');
    expect(ihram?.duas?.[0].translit).toMatch(/^Labbayk Allahumma labbayk/);
  });
  it('lists the five miqats and the supporting sections', () => {
    expect(MIQATS).toHaveLength(5);
    expect(PREPARATION.length).toBeGreaterThan(0);
    expect(IHRAM_RESTRICTIONS.length).toBeGreaterThan(0);
    expect(new Set(CHECKLIST).size).toBe(CHECKLIST.length);
  });
});
