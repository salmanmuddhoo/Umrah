import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { PinPad } from '@/components/PinPad';
import { Body, Button, Chips, H1, Input, Muted, Notice, Screen } from '@/components/ui';
import { ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { parseIdentifier } from '@/lib/identifier';
import type { CodeSent, Session } from '@/lib/types';
import { validateSignUp } from '@/lib/validate';

const KINDS = [
  { value: 'pilgrim', label: 'Pilgrim' },
  { value: 'umrah', label: 'Umrah provider' },
  { value: 'transport', label: 'Transport provider' },
] as const;
type Kind = (typeof KINDS)[number]['value'];

/**
 * identifier → code → then either:
 *   pin                       (they already have an account)
 *   details → newPin → confirmPin   (new account)
 *   newPin → confirmPin       (forgot PIN: `resetting` is true)
 */
type Step = 'identifier' | 'code' | 'pin' | 'details' | 'newPin' | 'confirmPin';

/** Sign-in and sign-up are one flow: the server tells us which it is once the code is confirmed. */
export default function LoginScreen() {
  const params = useLocalSearchParams<{ as?: string }>();
  const { api, signIn } = useAuth();

  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState<CodeSent | null>(null);
  const [code, setCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [resetting, setResetting] = useState(false);
  const [firstPin, setFirstPin] = useState('');
  const [as, setAs] = useState<Kind>(params.as === 'umrah' || params.as === 'transport' ? params.as : 'pilgrim');
  const [details, setDetails] = useState({ name: '', companyName: '', city: '', country: '', licenseNo: '' });
  const setDetail = (key: keyof typeof details) => (value: string) => setDetails((d) => ({ ...d, [key]: value }));

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (next: Step) => {
    setError(null);
    setInfo(null);
    setStep(next);
  };

  /** Runs a request, showing its error on the current step. Returns undefined when it failed. */
  async function attempt<T>(request: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await request();
    } catch (err) {
      setError(errorMessage(err));
      // An expired verification can only be fixed by getting a new code.
      if (err instanceof ApiError && err.status === 401) setStep('identifier');
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function finish(session: Session | undefined) {
    if (!session) return;
    await signIn(session);
    if (session.user.provider && step === 'confirmPin' && !resetting) router.replace('/provider');
    // Otherwise return to whatever they were doing (a package to book, a post to comment on).
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function sendCode(resend = false) {
    const id = parseIdentifier(identifier);
    if (!id) return setError('Enter an email address, or a phone number with its country code (for example +44 7700 900123).');
    const result = await attempt(() => api.startVerification(id.value));
    if (!result) return;
    setSent(result);
    setCode('');
    go('code');
    if (resend) setInfo('We sent you a new code.');
  }

  async function checkCode() {
    if (!/^\d{6}$/.test(code.trim())) return setError('Enter the 6-digit code.');
    const result = await attempt(() => api.confirmCode(identifier, code.trim()));
    if (!result) return;
    setVerificationToken(result.verificationToken);
    go(result.accountExists ? 'pin' : 'details');
  }

  function confirmNewPin(pin: string) {
    if (pin !== firstPin) {
      go('newPin');
      return setError('Those PINs did not match. Please choose your PIN again.');
    }
    void attempt(() =>
      resetting ? api.resetPin(verificationToken, pin) : api.register({ ...details, as, verificationToken, pin }),
    ).then(finish);
  }

  const startOver = <Button title="Use a different email or number" variant="ghost" onPress={() => go('identifier')} />;

  if (step === 'identifier') {
    return (
      <Screen>
        <H1>Welcome to My Ummah</H1>
        <Body>Enter your email address or phone number. We will send you a code to confirm it is yours.</Body>
        {error ? <Notice>{error}</Notice> : null}
        <Input
          label="Email or phone number"
          hint="Phone numbers need the country code, e.g. +44 7700 900123. Codes for phone numbers arrive on WhatsApp."
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onSubmitEditing={() => void sendCode()}
        />
        <Button title="Send me a code" onPress={() => void sendCode()} loading={busy} />
      </Screen>
    );
  }

  if (step === 'code') {
    return (
      <Screen>
        <H1>Enter your code</H1>
        <Body>
          We sent a 6-digit code {sent?.channel === 'whatsapp' ? 'on WhatsApp' : 'by email'} to {sent?.destination}. It expires in 10 minutes.
        </Body>
        {sent?.devCode ? <Notice tone="warn">Development server: no message was sent. Your code is {sent.devCode}</Notice> : null}
        {info ? <Notice tone="ok">{info}</Notice> : null}
        {error ? <Notice>{error}</Notice> : null}
        <Input
          label="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          onSubmitEditing={() => void checkCode()}
        />
        <Button title="Verify" onPress={() => void checkCode()} loading={busy} />
        <Button title="Send a new code" variant="ghost" onPress={() => void sendCode(true)} disabled={busy} />
        {startOver}
      </Screen>
    );
  }

  if (step === 'pin') {
    return (
      <Screen>
        <PinPad
          title="Enter your PIN"
          subtitle="The 4-digit PIN you chose when you joined."
          error={error}
          busy={busy}
          onComplete={(pin) => void attempt(() => api.login(verificationToken, pin)).then(finish)}
        />
        <Button
          title="Forgot PIN? Choose a new one"
          variant="ghost"
          onPress={() => {
            setResetting(true);
            go('newPin');
          }}
        />
        {startOver}
      </Screen>
    );
  }

  if (step === 'details') {
    return (
      <Screen>
        <H1>Create your account</H1>
        {error ? <Notice>{error}</Notice> : null}
        <Chips label="I am a" options={KINDS} value={as} onChange={setAs} />
        {as !== 'pilgrim' ? <Muted>We review every provider before their listings go live.</Muted> : null}
        <Input label="Your name" value={details.name} onChangeText={setDetail('name')} autoComplete="name" maxLength={80} />
        {as !== 'pilgrim' ? (
          <>
            <Input label="Company name" value={details.companyName} onChangeText={setDetail('companyName')} maxLength={120} />
            <Input label="City" value={details.city} onChangeText={setDetail('city')} maxLength={80} />
            <Input label="Country" value={details.country} onChangeText={setDetail('country')} maxLength={80} />
            <Input label="Licence / registration number" hint="Helps us verify your business faster." value={details.licenseNo} onChangeText={setDetail('licenseNo')} maxLength={80} />
          </>
        ) : null}
        <Button
          title="Continue"
          onPress={() => {
            const problem = validateSignUp({ ...details, as });
            if (problem) return setError(problem);
            go('newPin');
          }}
        />
      </Screen>
    );
  }

  if (step === 'newPin') {
    return (
      <Screen>
        <PinPad
          title={resetting ? 'Choose a new PIN' : 'Choose a 4-digit PIN'}
          subtitle="You will enter this PIN each time you open My Ummah."
          error={error}
          onComplete={(pin) => {
            setFirstPin(pin);
            go('confirmPin');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <PinPad title="Enter your PIN again" subtitle="Just to make sure it is right." error={error} busy={busy} onComplete={confirmNewPin} />
      <Button title="Choose a different PIN" variant="ghost" onPress={() => go('newPin')} disabled={busy} />
    </Screen>
  );
}
