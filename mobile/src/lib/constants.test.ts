import { pkg } from '@/test/fixtures';

import { inclusions, topicLabel, vehicleLabel } from './constants';

describe('inclusions', () => {
  it('lists only what the package includes, in a fixed order', () => {
    expect(inclusions(pkg)).toEqual(['Flights', 'Visa', 'Ziyarah tours']);
  });
  it('is empty for an accommodation-only package', () => {
    expect(inclusions({ incFlights: false, incVisa: false, incMeals: false, incTransport: false, incZiyarah: false })).toEqual([]);
  });
});

describe('labels', () => {
  it('maps known values and falls back to the raw value', () => {
    expect(topicLabel('first-timers')).toBe('First-timers');
    expect(topicLabel('unknown')).toBe('unknown');
    expect(vehicleLabel('VAN')).toBe('Van / minibus');
    expect(vehicleLabel('TUKTUK')).toBe('TUKTUK');
  });
});
