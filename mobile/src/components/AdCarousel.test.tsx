import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { Ad } from '@/lib/types';

import { AdCarousel } from './AdCarousel';

const ad = (id: string, overrides: Partial<Ad> = {}): Ad => ({
  id,
  advertiser: 'Noor Travel',
  headline: `Headline ${id}`,
  body: 'Flights and visa included.',
  cta: 'See package',
  theme: 'green',
  packageId: `pkg-${id}`,
  serviceId: null,
  ...overrides,
});

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const tick = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));

describe('AdCarousel', () => {
  it('renders nothing when there are no ads', async () => {
    await render(<AdCarousel ads={[]} onPress={() => {}} />);
    expect(screen.queryByText(/SPONSORED/)).toBeNull();
  });

  it('labels every card as sponsored, with the advertiser', async () => {
    await render(<AdCarousel ads={[ad('1'), ad('2', { advertiser: 'Haramain Rides' })]} onPress={() => {}} />);
    expect(screen.getByText('SPONSORED · NOOR TRAVEL')).toBeTruthy();
    expect(screen.getByText('SPONSORED · HARAMAIN RIDES')).toBeTruthy();
    expect(screen.getByLabelText('Sponsored by Haramain Rides: Headline 2')).toBeTruthy();
  });

  it('rotates on its own and wraps back to the first card', async () => {
    await render(<AdCarousel ads={[ad('1'), ad('2'), ad('3')]} onPress={() => {}} intervalMs={5000} />);
    expect(screen.getByLabelText('Ad 1 of 3')).toBeTruthy();
    await tick(5000);
    expect(screen.getByLabelText('Ad 2 of 3')).toBeTruthy();
    await tick(5000);
    expect(screen.getByLabelText('Ad 3 of 3')).toBeTruthy();
    await tick(5000);
    expect(screen.getByLabelText('Ad 1 of 3')).toBeTruthy();
  });

  it('does not rotate, or show position dots, for a single ad', async () => {
    await render(<AdCarousel ads={[ad('1')]} onPress={() => {}} />);
    await tick(20000);
    expect(screen.queryByLabelText(/^Ad \d of/)).toBeNull();
    expect(screen.getByText('Headline 1')).toBeTruthy();
  });

  it('reports which ad was tapped', async () => {
    const onPress = jest.fn();
    const ads = [ad('1'), ad('2')];
    await render(<AdCarousel ads={ads} onPress={onPress} />);
    await fireEvent.press(screen.getByLabelText('Sponsored by Noor Travel: Headline 2'));
    expect(onPress).toHaveBeenCalledWith(ads[1]);
  });

  it('shows a display-only ad without a button and ignores taps on it', async () => {
    const onPress = jest.fn();
    await render(<AdCarousel ads={[ad('1', { packageId: null })]} onPress={onPress} />);
    expect(screen.queryByText('See package')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Sponsored by Noor Travel: Headline 1'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('stays on a valid card when the list of ads shrinks', async () => {
    const view = await render(<AdCarousel ads={[ad('1'), ad('2'), ad('3')]} onPress={() => {}} intervalMs={1000} />);
    await tick(1000);
    await tick(1000);
    expect(screen.getByLabelText('Ad 3 of 3')).toBeTruthy();
    await view.rerender(<AdCarousel ads={[ad('1'), ad('2')]} onPress={() => {}} intervalMs={1000} />);
    expect(screen.getByLabelText('Ad 2 of 2')).toBeTruthy();
  });
});
