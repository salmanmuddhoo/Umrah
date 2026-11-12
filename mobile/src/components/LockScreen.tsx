import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, space } from '@/theme';

import { Logo } from './Logo';
import { StarPattern } from './motion';
import { PinPad } from './PinPad';
import { Button } from './ui';

/** Shown instead of the app whenever a signed-in device has not had its PIN entered yet. */
export function LockScreen() {
  const { user, unlock, forgotPin, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The server stops accepting the PIN after too many wrong tries; only a reset helps then.
  const [mustReset, setMustReset] = useState(false);

  async function tryPin(pin: string) {
    setBusy(true);
    try {
      await unlock(pin);
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError && err.status === 423) setMustReset(true);
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.sand }}>
      <StarPattern color={colors.patternEmerald} count={180} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: space.xl, gap: space.md }}>
        <Logo size={72} style={{ alignSelf: 'center' }} />
        <Text style={{ textAlign: 'center', color: colors.gold600, fontWeight: '700', letterSpacing: 1 }}>ONE UMMAH</Text>
        {mustReset ? (
          <Text accessibilityRole="alert" style={{ textAlign: 'center', fontSize: 15, lineHeight: 22, color: colors.danger }}>
            {error}
          </Text>
        ) : (
          <PinPad title={`Welcome back, ${user?.name.split(' ')[0] ?? ''}`} subtitle="Enter your 4-digit PIN" error={error} busy={busy} onComplete={tryPin} />
        )}
        <Button title={mustReset ? 'Reset PIN with a code' : 'Forgot PIN?'} variant={mustReset ? 'primary' : 'ghost'} onPress={() => void forgotPin()} />
        <Button title="Sign out" variant="ghost" onPress={() => void signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}
