import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import ApplyScreen from '@/app/provider/apply';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PROVIDER_TYPES } from '@/lib/constants';
import { user } from '@/test/fixtures';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    router: { push: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: jest.fn(() => ({})),
    Redirect: ({ href }: { href: string }) => <Text>redirect:{href}</Text>,
  };
});
jest.mock('@/lib/auth', () => ({ useAuth: jest.fn() }));

const api = { applyAsProvider: jest.fn() };
const refreshUser = jest.fn();
const as = (current: unknown) => (useAuth as jest.Mock).mockReturnValue({ api, user: current, refreshUser });

beforeEach(() => jest.clearAllMocks());

describe('ApplyScreen', () => {
  it('offers every kind of service from one screen', async () => {
    as(null);
    await render(<ApplyScreen />);
    expect(PROVIDER_TYPES.length).toBeGreaterThanOrEqual(6);
    for (const type of PROVIDER_TYPES) expect(screen.getByRole('button', { name: type.label })).toBeTruthy();
  });

  it('takes a visitor without an account to sign-up, carrying the service they chose', async () => {
    as(null);
    await render(<ApplyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Hotels & accommodation' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/login', params: { as: 'ACCOMMODATION' } });
  });

  it('lets a signed-in member apply, then opens their dashboard', async () => {
    as(user);
    api.applyAsProvider.mockResolvedValue({ id: 'p1' });
    await render(<ApplyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Guides & ziyarah' }));
    await fireEvent.changeText(screen.getByLabelText('Company name'), 'Madinah Walks');
    await fireEvent.changeText(screen.getByLabelText('City'), 'Madinah');
    await fireEvent.press(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/provider'));
    expect(api.applyAsProvider).toHaveBeenCalledWith(expect.objectContaining({ type: 'GUIDE', companyName: 'Madinah Walks', city: 'Madinah' }));
    expect(refreshUser).toHaveBeenCalled();
  });

  it('says when a service has no listing tools yet, but still lets them apply', async () => {
    as(user);
    await render(<ApplyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Food & catering' }));
    expect(screen.getByText(/tools for listing food & catering in the app are coming soon/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit application' })).toBeTruthy();
  });

  it('shows no such warning for services that can already list', async () => {
    as(user);
    await render(<ApplyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Transport' }));
    expect(screen.queryByText(/coming soon/)).toBeNull();
  });

  it('requires a company name and shows server errors', async () => {
    as(user);
    api.applyAsProvider.mockRejectedValue(new ApiError(409, 'You have already applied as a service provider.'));
    await render(<ApplyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Other services' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Submit application' }));
    expect(screen.getByText('Please enter your company name.')).toBeTruthy();
    expect(api.applyAsProvider).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Company name'), 'Haram Wheelchairs');
    await fireEvent.press(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findByText('You have already applied as a service provider.')).toBeTruthy();
  });

  it('lets them go back and pick a different service', async () => {
    as(user);
    await render(<ApplyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Transport' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Choose a different service' }));
    expect(screen.getByRole('button', { name: 'Umrah packages' })).toBeTruthy();
  });

  it('sends someone who is already a provider to their dashboard', async () => {
    as({ ...user, provider: { id: 'p1', type: 'UMRAH' } });
    await render(<ApplyScreen />);
    expect(screen.getByText('redirect:/provider')).toBeTruthy();
  });
});
