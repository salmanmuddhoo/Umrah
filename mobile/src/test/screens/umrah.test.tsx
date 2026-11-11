import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import UmrahScreen from '@/app/(tabs)/umrah';

jest.mock('expo-router', () => ({ router: { setParams: jest.fn() }, useLocalSearchParams: jest.fn(() => ({})) }));
// The sections themselves are tested elsewhere; here each is a labelled stand-in.
jest.mock('@/features/PackagesList', () => ({ PackagesList: () => mockView('packages') }));
jest.mock('@/features/TransportList', () => ({ TransportList: () => mockView('transport') }));
jest.mock('@/features/GuideContent', () => ({ GuideContent: () => mockView('guide') }));
jest.mock('@/features/VisaGuide', () => ({ VisaGuide: () => mockView('visa') }));
jest.mock('@/features/ZamzamGuide', () => ({ ZamzamGuide: () => mockView('zamzam') }));

function mockView(name: string) {
  const { Text } = jest.requireActual('react-native');
  return <Text>view:{name}</Text>;
}

const at = (section?: string) => (useLocalSearchParams as jest.Mock).mockReturnValue(section ? { section } : {});
beforeEach(() => jest.clearAllMocks());

describe('UmrahScreen', () => {
  it('opens on Services, showing only the bookable sections', async () => {
    at();
    await render(<UmrahScreen />);
    expect(screen.getByRole('tab', { name: 'Services' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByRole('button', { name: 'Packages' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Transport' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Visa' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Zamzam' })).toBeNull();
    expect(screen.getByText('view:packages')).toBeTruthy();
  });

  it('shows only the guides under Guides', async () => {
    at('visa');
    await render(<UmrahScreen />);
    expect(screen.getByRole('tab', { name: 'Guides' }).props.accessibilityState).toMatchObject({ selected: true });
    for (const name of ['How to perform Umrah', 'Visa', 'Zamzam']) expect(screen.getByRole('button', { name })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Packages' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Transport' })).toBeNull();
    expect(screen.getByText('view:visa')).toBeTruthy();
  });

  it('switches between the two groups, landing on the first section of each', async () => {
    at();
    await render(<UmrahScreen />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Guides' }));
    expect(router.setParams).toHaveBeenLastCalledWith({ section: 'guide' });

    at('zamzam');
    await render(<UmrahScreen />);
    await fireEvent.press(screen.getAllByRole('tab', { name: 'Services' }).at(-1)!);
    expect(router.setParams).toHaveBeenLastCalledWith({ section: 'packages' });
  });

  it('moves between sections inside a group', async () => {
    at('guide');
    await render(<UmrahScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Zamzam' }));
    expect(router.setParams).toHaveBeenCalledWith({ section: 'zamzam' });
  });

  it('no longer holds the planner, which has its own tab', async () => {
    at('planner');
    await render(<UmrahScreen />);
    expect(screen.queryByRole('button', { name: 'Planner' })).toBeNull();
    expect(screen.getByText('view:packages')).toBeTruthy();
  });
});
