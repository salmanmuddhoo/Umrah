import { render, screen } from '@testing-library/react-native';

import { VisaGuide } from '@/features/VisaGuide';
import { ZamzamGuide } from '@/features/ZamzamGuide';
import { useAuth } from '@/lib/auth';
import { DEFAULT_PRICES, mergePrices } from '@/lib/prices';
import { VISA_ROUTES } from '@/lib/visa';
import { ZAMZAM_PLACES, ZAMZAM_RULES } from '@/lib/zamzam';

jest.mock('expo-router', () => ({ useIsFocused: () => true }));
jest.mock('@/lib/auth', () => ({ useAuth: jest.fn() }));

const meta = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  (useAuth as jest.Mock).mockReturnValue({ api: { meta } });
});

describe('mergePrices', () => {
  it('has a bundled price for Zamzam and for every visa route', () => {
    expect(DEFAULT_PRICES.zamzam).toMatch(/SAR/);
    for (const route of VISA_ROUTES) expect(Object.keys(DEFAULT_PRICES)).toContain(`visa.${route.id}`);
  });
  it("prefers the server's prices and ignores blank or malformed ones", () => {
    const merged = mergePrices({ zamzam: 'SAR 14 for one 5-litre bottle', 'visa.tourist': '  ', 'visa.gcc': 42, extra: 'ignored' });
    expect(merged.zamzam).toBe('SAR 14 for one 5-litre bottle');
    expect(merged['visa.tourist']).toBe(DEFAULT_PRICES['visa.tourist']);
    expect(merged['visa.gcc']).toBe(DEFAULT_PRICES['visa.gcc']);
    expect(merged).not.toHaveProperty('extra');
  });
  it('falls back completely when nothing arrives', () => {
    expect(mergePrices(null)).toEqual(DEFAULT_PRICES);
  });
});

describe('ZamzamGuide', () => {
  it('shows the bundled price and where to buy when offline', async () => {
    meta.mockRejectedValue(new Error('offline'));
    await render(<ZamzamGuide />);
    expect(screen.getByLabelText(`Price: ${DEFAULT_PRICES.zamzam}`)).toBeTruthy();
    for (const place of ZAMZAM_PLACES) expect(screen.getByText(place.airport)).toBeTruthy();
    expect(screen.getByText(ZAMZAM_RULES[0])).toBeTruthy();
  });

  it("shows the price the platform owner has set, with when it was checked", async () => {
    meta.mockResolvedValue({ prices: { zamzam: 'SAR 14 for one 5-litre bottle', reviewed: 'March 2027' } });
    await render(<ZamzamGuide />);
    expect(await screen.findByText('SAR 14 for one 5-litre bottle')).toBeTruthy();
    expect(screen.getByText(/Price last checked March 2027/)).toBeTruthy();
  });

  it('covers both pilgrim airports', () => {
    expect(ZAMZAM_PLACES.map((p) => p.airport).join(' ')).toMatch(/Jeddah.*Madinah/);
  });
});

describe('VisaGuide', () => {
  it('shows a cost for every type of visa', async () => {
    meta.mockRejectedValue(new Error('offline'));
    await render(<VisaGuide />);
    for (const route of VISA_ROUTES) {
      const price = DEFAULT_PRICES[`visa.${route.id}` as keyof typeof DEFAULT_PRICES];
      expect(screen.getByLabelText(`Cost of the ${route.title}: ${price}`)).toBeTruthy();
    }
  });

  it("uses the platform owner's updated visa costs", async () => {
    meta.mockResolvedValue({ prices: { 'visa.tourist': 'SAR 600, including insurance' } });
    await render(<VisaGuide />);
    expect(await screen.findByText('SAR 600, including insurance')).toBeTruthy();
    expect(screen.getByText(DEFAULT_PRICES['visa.arrival'])).toBeTruthy();
  });
});
