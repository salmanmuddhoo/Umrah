import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { user } from '@/test/fixtures';

import LoginScreen from '@/app/login';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() } }));
jest.mock('@/lib/auth', () => ({ useAuth: jest.fn() }));

const login = jest.fn();
const signIn = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useAuth as jest.Mock).mockReturnValue({ api: { login }, signIn });
});

async function fillAndSubmit(email: string, password: string) {
  await render(<LoginScreen />);
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await fireEvent.changeText(screen.getByLabelText('Password'), password);
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginScreen', () => {
  it('checks the form before contacting the server', async () => {
    await fillAndSubmit('not-an-email', 'password123');
    expect(await screen.findByText('Enter your email address.')).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });

  it('signs in and returns to the previous screen', async () => {
    const session = { token: 't', user };
    login.mockResolvedValue(session);
    (router.canGoBack as jest.Mock).mockReturnValue(true);

    await fillAndSubmit('  aisha@example.com ', 'password123');

    await waitFor(() => expect(signIn).toHaveBeenCalledWith(session));
    expect(login).toHaveBeenCalledWith({ email: 'aisha@example.com', password: 'password123' });
    expect(router.back).toHaveBeenCalled();
  });

  it('goes home when there is no previous screen', async () => {
    login.mockResolvedValue({ token: 't', user });
    (router.canGoBack as jest.Mock).mockReturnValue(false);
    await fillAndSubmit('aisha@example.com', 'password123');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it("shows the server's message when the password is wrong, and lets the user retry", async () => {
    login.mockRejectedValue(new ApiError(401, 'Incorrect email or password.'));
    await fillAndSubmit('aisha@example.com', 'wrong-password');
    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign in' }).props.accessibilityState).toMatchObject({ disabled: false });
  });
});
