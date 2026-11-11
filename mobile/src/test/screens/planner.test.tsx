import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import PlanScreen from '@/app/planner/[id]';
import { PlannerList } from '@/features/PlannerList';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Plan } from '@/lib/types';
import { user } from '@/test/fixtures';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    router: { push: jest.fn(), back: jest.fn() },
    useIsFocused: () => true,
    useLocalSearchParams: () => ({ id: 'plan1' }),
    Redirect: ({ href }: { href: string }) => <Text>redirect:{href}</Text>,
  };
});
jest.mock('@/lib/auth', () => ({ useAuth: jest.fn() }));

const plan = (): Plan => ({
  id: 'plan1',
  title: 'Family Umrah',
  departDate: '2031-03-01T00:00:00.000Z',
  returnDate: '2031-03-12T00:00:00.000Z',
  travellers: 4,
  notes: '',
  items: [
    { id: 'i1', planId: 'plan1', stage: 'PREPARE', text: 'Apply for the visa', done: true, position: 0 },
    { id: 'i2', planId: 'plan1', stage: 'PREPARE', text: 'Book a package', done: false, position: 1 },
    { id: 'i3', planId: 'plan1', stage: 'RETURN', text: 'Buy Zamzam water at the airport', done: false, position: 2 },
  ],
});

const api = { plans: jest.fn(), plan: jest.fn(), updatePlanItem: jest.fn(), addPlanItem: jest.fn(), deletePlanItem: jest.fn(), deletePlan: jest.fn() };
const signedIn = (yes = true) => (useAuth as jest.Mock).mockReturnValue({ api, user: yes ? user : null });

beforeEach(() => {
  jest.clearAllMocks();
  api.plan.mockResolvedValue(plan());
  api.updatePlanItem.mockResolvedValue({});
});

describe('PlannerList', () => {
  it('invites a signed-out visitor to sign in, without calling the server for plans', async () => {
    signedIn(false);
    await render(<PlannerList />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in to start a plan' }));
    expect(router.push).toHaveBeenCalledWith('/login');
    expect(api.plans).not.toHaveBeenCalled();
  });

  it('lists plans with dates, travellers and progress, and opens one', async () => {
    signedIn();
    api.plans.mockResolvedValue([{ ...plan(), items: undefined, itemCount: 19, doneCount: 5 }]);
    await render(<PlannerList />);
    expect(await screen.findByText('Family Umrah')).toBeTruthy();
    expect(screen.getByText('1 Mar 2031 – 12 Mar 2031 · 4 travellers')).toBeTruthy();
    expect(screen.getByText('5 of 19 done')).toBeTruthy();
    expect(screen.getByLabelText('Family Umrah checklist progress').props.accessibilityValue).toMatchObject({ now: 26 });

    await fireEvent.press(screen.getByRole('button', { name: 'Open plan Family Umrah' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/planner/[id]', params: { id: 'plan1' } });
  });

  it('encourages a first plan when there are none', async () => {
    signedIn();
    api.plans.mockResolvedValue([]);
    await render(<PlannerList />);
    expect(await screen.findByText(/No plans yet/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'New plan' }));
    expect(router.push).toHaveBeenCalledWith('/planner/new');
  });
});

describe('PlanScreen', () => {
  beforeEach(() => signedIn());

  it('groups the checklist by stage of the trip and shows progress', async () => {
    await render(<PlanScreen />);
    // Stage names also appear as choices in the "add your own" form, so look for the headings.
    expect(await screen.findByRole('header', { name: 'Getting ready' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Coming home' })).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'In Makkah' })).toBeNull(); // nothing in that stage
    expect(screen.getByText('1 of 3 done')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Apply for the visa' }).props.accessibilityState).toMatchObject({ checked: true });
  });

  it('ticks an item immediately and saves it', async () => {
    await render(<PlanScreen />);
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Book a package' }));
    expect(screen.getByText('2 of 3 done')).toBeTruthy();
    expect(api.updatePlanItem).toHaveBeenCalledWith('i2', { done: true });
  });

  it('unticks it again if the server could not save', async () => {
    api.updatePlanItem.mockRejectedValue(new ApiError(0, 'Could not reach My Ummah.'));
    await render(<PlanScreen />);
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Book a package' }));
    expect(await screen.findByText('Could not reach My Ummah.')).toBeTruthy();
    expect(screen.getByText('1 of 3 done')).toBeTruthy();
  });

  it("adds the traveller's own item to the stage they pick", async () => {
    api.addPlanItem.mockResolvedValue({ id: 'i9', planId: 'plan1', stage: 'MADINAH', text: 'Buy dates', done: false, position: 3 });
    await render(<PlanScreen />);
    await fireEvent.changeText(await screen.findByLabelText('What needs doing?'), 'Buy dates');
    await fireEvent.press(screen.getByRole('button', { name: 'In Madinah' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add to checklist' }));

    expect(await screen.findByRole('checkbox', { name: 'Buy dates' })).toBeTruthy();
    expect(api.addPlanItem).toHaveBeenCalledWith('plan1', { text: 'Buy dates', stage: 'MADINAH' });
    expect(screen.getByText('1 of 4 done')).toBeTruthy();
  });

  it('does not send an empty item', async () => {
    await render(<PlanScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Add to checklist' }));
    expect(screen.getByText('Write what needs doing.')).toBeTruthy();
    expect(api.addPlanItem).not.toHaveBeenCalled();
  });

  it('sends a signed-out visitor to sign in', async () => {
    signedIn(false);
    await render(<PlanScreen />);
    await waitFor(() => expect(screen.getByText('redirect:/login')).toBeTruthy());
  });
});
