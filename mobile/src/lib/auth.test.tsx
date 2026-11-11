import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { user } from '@/test/fixtures';

import type { Api } from './api';
import { AuthProvider, useAuth } from './auth';
import { tokenStorage } from './storage';

jest.mock('./storage', () => ({ tokenStorage: { get: jest.fn(), set: jest.fn() } }));
const storage = tokenStorage as jest.Mocked<typeof tokenStorage>;

function Probe() {
  const { ready, user: current, signIn, signOut } = useAuth();
  return (
    <>
      <Text>{!ready ? 'starting' : current ? `in:${current.name}` : 'out'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="sign in" onPress={() => void signIn({ token: 'fresh-token', user })} />
      <Pressable accessibilityRole="button" accessibilityLabel="sign out" onPress={() => void signOut()} />
    </>
  );
}

const renderWith = (api: Partial<Api>) =>
  render(
    <AuthProvider api={api as Api}>
      <Probe />
    </AuthProvider>,
  );

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

  it('restores the saved session on launch', async () => {
    storage.get.mockResolvedValue('saved-token');
    await renderWith({ me: jest.fn().mockResolvedValue({ user }) });
    await waitFor(() => expect(screen.getByText('in:Aisha Rahman')).toBeTruthy());
  });

  it('starts signed out when the saved session can no longer be verified', async () => {
    storage.get.mockResolvedValue('expired-token');
    await renderWith({ me: jest.fn().mockRejectedValue(new Error('401')) });
    await waitFor(() => expect(screen.getByText('out')).toBeTruthy());
  });

  it('saves the token on sign-in and clears it on sign-out', async () => {
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
