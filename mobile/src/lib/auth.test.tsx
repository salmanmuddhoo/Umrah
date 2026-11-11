import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Pressable, Text, type AppStateStatus } from 'react-native';

import { user } from '@/test/fixtures';

import { ApiError, type Api } from './api';
import { AuthProvider, RELOCK_AFTER_MS, useAuth } from './auth';
import { tokenStorage } from './storage';

jest.mock('./storage', () => ({ tokenStorage: { get: jest.fn(), set: jest.fn() } }));
const storage = tokenStorage as jest.Mocked<typeof tokenStorage>;

function Probe() {
  const { ready, user: current, locked, wantsSignIn, signIn, signOut, unlock, forgotPin } = useAuth();
  const state = !ready ? 'starting' : !current ? 'out' : locked ? `locked:${current.name}` : `in:${current.name}`;
  return (
    <>
      <Text>{state}</Text>
      <Text>{wantsSignIn ? 'wants-sign-in' : 'no-redirect'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="sign in" onPress={() => void signIn({ token: 'fresh-token', user })} />
      <Pressable accessibilityRole="button" accessibilityLabel="sign out" onPress={() => void signOut()} />
      <Pressable accessibilityRole="button" accessibilityLabel="right pin" onPress={() => void unlock('4821')} />
      <Pressable accessibilityRole="button" accessibilityLabel="wrong pin" onPress={() => void unlock('0000').catch(() => {})} />
      <Pressable accessibilityRole="button" accessibilityLabel="forgot pin" onPress={() => void forgotPin()} />
    </>
  );
}

const renderWith = (api: Partial<Api>) =>
  render(
    <AuthProvider api={api as Api}>
      <Probe />
    </AuthProvider>,
  );

const verifyPin = jest.fn(async (pin: string) => {
  if (pin !== '4821') throw new ApiError(403, 'Wrong PIN. 4 attempts left.');
  return { ok: true };
});
const savedSession = () => ({ me: jest.fn().mockResolvedValue({ user }), verifyPin });

beforeEach(() => {
  jest.clearAllMocks();
  storage.set.mockResolvedValue();
});

describe('AuthProvider', () => {
  it('starts signed out when no session was saved, without calling the server', async () => {
    storage.get.mockResolvedValue(null);
    const me = jest.fn();
    await renderWith({ me });
    await waitFor(() => expect(screen.getByText('out')).toBeTruthy());
    expect(me).not.toHaveBeenCalled();
  });

  it('restores the saved session on launch, but behind the PIN', async () => {
    storage.get.mockResolvedValue('saved-token');
    await renderWith(savedSession());
    await waitFor(() => expect(screen.getByText('locked:Aisha Rahman')).toBeTruthy());
  });

  it('starts signed out when the saved session can no longer be verified', async () => {
    storage.get.mockResolvedValue('expired-token');
    await renderWith({ me: jest.fn().mockRejectedValue(new Error('401')) });
    await waitFor(() => expect(screen.getByText('out')).toBeTruthy());
  });

  it('saves the token on sign-in (already unlocked) and clears it on sign-out', async () => {
    storage.get.mockResolvedValue(null);
    await renderWith({ me: jest.fn() });
    await waitFor(() => expect(screen.getByText('out')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('sign in'));
    expect(screen.getByText('in:Aisha Rahman')).toBeTruthy();
    expect(storage.set).toHaveBeenLastCalledWith('fresh-token');

    await fireEvent.press(screen.getByLabelText('sign out'));
    expect(screen.getByText('out')).toBeTruthy();
    expect(storage.set).toHaveBeenLastCalledWith(null);
  });

  it('refuses to be used outside the provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Probe />)).rejects.toThrow('useAuth must be used inside <AuthProvider>');
  });
});

describe('app lock', () => {
  beforeEach(() => storage.get.mockResolvedValue('saved-token'));

  it('stays locked after a wrong PIN and opens with the right one', async () => {
    await renderWith(savedSession());
    await waitFor(() => expect(screen.getByText('locked:Aisha Rahman')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('wrong pin'));
    expect(screen.getByText('locked:Aisha Rahman')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('right pin'));
    await waitFor(() => expect(screen.getByText('in:Aisha Rahman')).toBeTruthy());
    expect(verifyPin).toHaveBeenCalledWith('4821');
  });

  it('"Forgot PIN" signs out and asks for the sign-in screen', async () => {
    await renderWith(savedSession());
    await waitFor(() => expect(screen.getByText('locked:Aisha Rahman')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('forgot pin'));
    await waitFor(() => expect(screen.getByText('wants-sign-in')).toBeTruthy());
    expect(screen.getByText('out')).toBeTruthy();
    expect(storage.set).toHaveBeenLastCalledWith(null);
  });

  describe('returning from the background', () => {
    let emit: (state: AppStateStatus) => void;
    let now: jest.SpyInstance;

    beforeEach(() => {
      jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
        emit = listener as (state: AppStateStatus) => void;
        return { remove: jest.fn() } as never;
      });
      now = jest.spyOn(Date, 'now');
    });
    afterEach(() => jest.restoreAllMocks());

    async function unlockedApp() {
      await renderWith(savedSession());
      await waitFor(() => expect(screen.getByText('locked:Aisha Rahman')).toBeTruthy());
      await fireEvent.press(screen.getByLabelText('right pin'));
      await waitFor(() => expect(screen.getByText('in:Aisha Rahman')).toBeTruthy());
    }

    async function awayFor(ms: number) {
      now.mockReturnValue(1_000_000);
      emit('background');
      now.mockReturnValue(1_000_000 + ms);
      emit('active');
    }

    it('asks for the PIN again after a long absence', async () => {
      await unlockedApp();
      await awayFor(RELOCK_AFTER_MS + 1000);
      await waitFor(() => expect(screen.getByText('locked:Aisha Rahman')).toBeTruthy());
    });

    it('does not interrupt a quick switch to another app', async () => {
      await unlockedApp();
      await awayFor(5000);
      expect(screen.getByText('in:Aisha Rahman')).toBeTruthy();
    });
  });
});
