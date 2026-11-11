import { useAuth } from './auth';
import { useQuery } from './useQuery';

/**
 * Prices quoted in the guides. The server sends the current ones (the platform
 * owner edits them in the admin console); these are what the app shows before
 * that arrives or when it is offline. They mirror GUIDE_PRICES on the server.
 */
export const DEFAULT_PRICES = {
  zamzam: 'SAR 12.50 for one 5-litre bottle',
  'visa.umrah': 'Varies by country and agent; usually included in the price of a package',
  'visa.tourist': 'About SAR 535, including medical insurance',
  'visa.arrival': 'About SAR 480, including medical insurance',
  'visa.transit': "Set by the airline's stopover programme; shown when you book the flight",
  'visa.gcc': 'About SAR 300, plus medical insurance',
  reviewed: 'November 2026',
} as const;

export type Prices = Record<keyof typeof DEFAULT_PRICES, string>;

/** Server prices laid over the bundled ones, ignoring anything missing or blank. */
export function mergePrices(fromServer: Partial<Record<string, unknown>> | null | undefined): Prices {
  const merged: Prices = { ...DEFAULT_PRICES };
  for (const key of Object.keys(DEFAULT_PRICES) as (keyof Prices)[]) {
    const value = fromServer?.[key];
    if (typeof value === 'string' && value.trim()) merged[key] = value.trim();
  }
  return merged;
}

export function usePrices(): Prices {
  const { api } = useAuth();
  const { data } = useQuery('meta', () => api.meta());
  return mergePrices(data?.prices);
}
