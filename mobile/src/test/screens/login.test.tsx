import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import LoginScreen from '@/app/login';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { user } from '@/test/fixtures';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/lib/auth', () => ({ useAuth: jest.fn() }));

const api = {
  startVerification: jest.fn(),
  confirmCode: jest.fn(),
  register: jest.fn(),
  login: jest.fn(),
  resetPin: jest.fn(),
};
const signIn = jest.fn();
const session = { token: 't', user };

beforeEach(() => {
  jest.clearAllMocks();
  (useAuth as jest.Mock).mockReturnValue({ api, signIn });
  (router.canGoBack as jest.Mock).mockReturnValue(true);
  api.startVerification.mockResolvedValue({ channel: 'email', destination: 'a•••@example.com' });
});

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
async function enterPin(pin: string) {
  for (const digit of pin) await press(digit);
}

/** Gets as far as a confirmed code. */
async function verify(identifier: string, accountExists: boolean) {
  api.confirmCode.mockResolvedValue({ verificationToken: 'vt', accountExists });
  await render(<LoginScreen />);
  await fireEvent.changeText(screen.getByLabelText('Email or phone number'), identifier);
  await press('Send me a code');
  await fireEvent.changeText(await screen.findByLabelText('Verification code'), '123456');
  await press('Verify');
}

describe('LoginScreen', () => {
  it('rejects something that is neither an email nor an international number, without calling the server', async () => {
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('Email or phone number'), '07700 900123');
    await press('Send me a code');
    expect(await screen.findByText(/phone number with its country code/)).toBeTruthy();
    expect(api.startVerification).not.toHaveBeenCalled();
  });

  it('sends phone-number codes on WhatsApp and says so', async () => {
    api.startVerification.mockResolvedValue({ channel: 'whatsapp', destination: '+44••••••0123' });
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('Email or phone number'), '+44 7700 900123');
    await press('Send me a code');
    expect(await screen.findByText(/on WhatsApp to \+44••••••0123/)).toBeTruthy();
    expect(api.startVerification).toHaveBeenCalledWith('+447700900123');
  });

  it('signs an existing member in with their code and PIN', async () => {
    api.login.mockResolvedValue(session);
    await verify('aisha@example.com', true);
    await screen.findByText('Enter your PIN');
    await enterPin('4821');

    await waitFor(() => expect(signIn).toHaveBeenCalledWith(session));
    expect(api.confirmCode).toHaveBeenCalledWith('aisha@example.com', '123456');
    expect(api.login).toHaveBeenCalledWith('vt', '4821');
    expect(router.back).toHaveBeenCalled();
  });

  it('shows a wrong-PIN error and lets them try again', async () => {
    api.login.mockRejectedValueOnce(new ApiError(403, 'Wrong PIN. 4 attempts left.')).mockResolvedValueOnce(session);
    await verify('aisha@example.com', true);
    await screen.findByText('Enter your PIN');
    await enterPin('0000');
    expect(await screen.findByText('Wrong PIN. 4 attempts left.')).toBeTruthy();
    expect(signIn).not.toHaveBeenCalled();
    await enterPin('4821');
    await waitFor(() => expect(signIn).toHaveBeenCalledWith(session));
  });

  it('creates a new account: details, then a PIN entered twice', async () => {
    api.register.mockResolvedValue(session);
    await verify('new@example.com', false);
    await fireEvent.changeText(await screen.findByLabelText('Your name'), 'Aisha Rahman');
    await press('Continue');
    await screen.findByText('Choose a 4-digit PIN');
    await enterPin('4821');
    await screen.findByText('Enter your PIN again');
    await enterPin('4821');

    await waitFor(() => expect(signIn).toHaveBeenCalledWith(session));
    expect(api.register).toHaveBeenCalledWith(expect.objectContaining({ verificationToken: 'vt', pin: '4821', name: 'Aisha Rahman', as: 'pilgrim' }));
  });

  it('does not create the account when the two PINs differ', async () => {
    await verify('new@example.com', false);
    await fireEvent.changeText(await screen.findByLabelText('Your name'), 'Aisha Rahman');
    await press('Continue');
    await screen.findByText('Choose a 4-digit PIN');
    await enterPin('4821');
    await screen.findByText('Enter your PIN again');
    await enterPin('4822');

    expect(await screen.findByText(/did not match/)).toBeTruthy();
    expect(screen.getByText('Choose a 4-digit PIN')).toBeTruthy();
    expect(api.register).not.toHaveBeenCalled();
  });

  describe('arriving from "Become a service provider"', () => {
    beforeEach(() => (useLocalSearchParams as jest.Mock).mockReturnValue({ as: 'CATERING' }));
    afterEach(() => (useLocalSearchParams as jest.Mock).mockReturnValue({}));

    it('asks a new provider for their company, then registers them for the chosen service', async () => {
      const providerSession = { token: 't', user: { ...user, provider: { id: 'p1', type: 'CATERING' } } };
      api.register.mockResolvedValue(providerSession);
      await verify('new@example.com', false);
      expect(await screen.findByText('Apply: Food & catering')).toBeTruthy();
      await fireEvent.changeText(screen.getByLabelText('Your name'), 'Huda');
      await press('Continue');
      expect(await screen.findByText('Please enter your company name.')).toBeTruthy();

      await fireEvent.changeText(screen.getByLabelText('Company name'), 'Madinah Kitchen');
      await press('Continue');
      await screen.findByText('Choose a 4-digit PIN');
      await enterPin('4821');
      await screen.findByText('Enter your PIN again');
      await enterPin('4821');

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/provider'));
      expect(api.register).toHaveBeenCalledWith(expect.objectContaining({ as: 'CATERING', companyName: 'Madinah Kitchen', name: 'Huda' }));
    });

    it('sends an existing member on to finish their application after signing in', async () => {
      api.login.mockResolvedValue(session);
      await verify('aisha@example.com', true);
      await screen.findByText('Enter your PIN');
      await enterPin('4821');
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/provider/apply', params: { type: 'CATERING' } }));
    });
  });

  it('does not ask an ordinary pilgrim about a company', async () => {
    await verify('new@example.com', false);
    await screen.findByLabelText('Your name');
    expect(screen.queryByLabelText('Company name')).toBeNull();
  });

  it('lets someone who forgot their PIN choose a new one after the code', async () => {
    api.resetPin.mockResolvedValue(session);
    await verify('aisha@example.com', true);
    await screen.findByText('Enter your PIN');
    await press('Forgot PIN? Choose a new one');
    await screen.findByText('Choose a new PIN');
    await enterPin('7310');
    await screen.findByText('Enter your PIN again');
    await enterPin('7310');

    await waitFor(() => expect(signIn).toHaveBeenCalledWith(session));
    expect(api.resetPin).toHaveBeenCalledWith('vt', '7310');
    expect(api.register).not.toHaveBeenCalled();
  });

  it('shows the code only when the development server hands it back', async () => {
    api.startVerification.mockResolvedValue({ channel: 'email', destination: 'a•••@example.com', devCode: '654321' });
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('Email or phone number'), 'aisha@example.com');
    await press('Send me a code');
    expect(await screen.findByText(/Your code is 654321/)).toBeTruthy();
  });

  it('goes back to the start when the verification has expired', async () => {
    api.login.mockRejectedValue(new ApiError(401, 'Your verification has expired. Please start again.'));
    await verify('aisha@example.com', true);
    await screen.findByText('Enter your PIN');
    await enterPin('4821');
    expect(await screen.findByText('Your verification has expired. Please start again.')).toBeTruthy();
    expect(screen.getByLabelText('Email or phone number')).toBeTruthy();
  });
});
