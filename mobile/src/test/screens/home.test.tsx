import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import HomeScreen, { SHORTCUTS } from '@/app/(tabs)/index';
import { useAuth } from '@/lib/auth';
import type { Ad } from '@/lib/types';
import { pkg, user } from '@/test/fixtures';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  useIsFocused: () => true,
}));
jest.mock('@/lib/auth', () => ({ useAuth: jest.fn() }));

const packageAd: Ad = { id: 'ad1', advertiser: 'Noor Travel', headline: 'Stay steps from the Haram', body: '', cta: 'See package', theme: 'green', packageId: 'pkg9', serviceId: null };
const rideAd: Ad = { id: 'ad2', advertiser: 'Haramain Rides', headline: 'Makkah to Madinah', body: '', cta: 'Book a ride', theme: 'night', packageId: null, serviceId: 'svc4' };

const api = { ads: jest.fn(), adClick: jest.fn(), packages: jest.fn() };

function setup(signedIn = false) {
  (useAuth as jest.Mock).mockReturnValue({ api, user: signedIn ? user : null });
  return render(<HomeScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
  api.ads.mockResolvedValue([packageAd, rideAd]);
  api.adClick.mockResolvedValue({ ok: true });
  api.packages.mockResolvedValue([pkg]);
});

describe('HomeScreen', () => {
  it('greets a signed-in pilgrim by first name', async () => {
    await setup(true);
    expect(screen.getByText('Assalamu alaikum, Aisha')).toBeTruthy();
  });

  it('offers a shortcut to every service', async () => {
    await setup();
    expect(SHORTCUTS.map((s) => s.title)).toEqual(['Umrah packages', 'Transport', 'How to perform Umrah', 'Visa guide', 'Community', 'My bookings']);
    for (const { title } of SHORTCUTS) expect(screen.getByRole('button', { name: title })).toBeTruthy();
  });

  it.each([
    ['Umrah packages', 'packages'],
    ['Transport', 'transport'],
    ['How to perform Umrah', 'guide'],
    ['Visa guide', 'visa'],
  ])('%s opens the Umrah tab on the %s section', async (title, section) => {
    await setup();
    await fireEvent.press(screen.getByRole('button', { name: title }));
    expect(router.navigate).toHaveBeenCalledWith({ pathname: '/umrah', params: { section } });
  });

  it('sends a signed-out visitor to sign in before showing bookings', async () => {
    await setup(false);
    await fireEvent.press(screen.getByRole('button', { name: 'My bookings' }));
    expect(router.push).toHaveBeenCalledWith('/login');
  });

  it('opens bookings directly when signed in', async () => {
    await setup(true);
    await fireEvent.press(screen.getByRole('button', { name: 'My bookings' }));
    expect(router.push).toHaveBeenCalledWith('/bookings');
  });

  it('shows the sponsored cards and the next departures', async () => {
    await setup();
    expect(await screen.findByText('Stay steps from the Haram')).toBeTruthy();
    expect(screen.getByText('SPONSORED · HARAMAIN RIDES')).toBeTruthy();
    expect(screen.getByText('10-day Economy Umrah')).toBeTruthy();
  });

  it('counts the tap and opens the advertised package', async () => {
    await setup();
    await fireEvent.press(await screen.findByLabelText('Sponsored by Noor Travel: Stay steps from the Haram'));
    expect(api.adClick).toHaveBeenCalledWith('ad1');
    expect(router.push).toHaveBeenCalledWith({ pathname: '/packages/[id]', params: { id: 'pkg9' } });
  });

  it('opens the advertised transport service', async () => {
    await setup();
    await fireEvent.press(await screen.findByLabelText('Sponsored by Haramain Rides: Makkah to Madinah'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/transport/[id]', params: { id: 'svc4' } });
  });

  it('still opens the listing when counting the tap fails', async () => {
    api.adClick.mockRejectedValue(new Error('offline'));
    await setup();
    await fireEvent.press(await screen.findByLabelText('Sponsored by Noor Travel: Stay steps from the Haram'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/packages/[id]', params: { id: 'pkg9' } });
  });

  it('keeps working when ads cannot be loaded', async () => {
    api.ads.mockRejectedValue(new Error('offline'));
    await setup();
    await waitFor(() => expect(screen.getByText('10-day Economy Umrah')).toBeTruthy());
    expect(screen.queryByText(/SPONSORED/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Visa guide' })).toBeTruthy();
  });
});
