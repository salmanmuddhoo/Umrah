import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { GradientFill } from '@/components/Gradient';
import { LockScreen } from '@/components/LockScreen';
import { QueryState } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Screens />
    </AuthProvider>
  );
}

/**
 * Screens only mount once the saved sign-in has been checked, so no screen
 * ever loads data as "signed out" and then has to correct itself — and never
 * before the PIN has been entered on a device that is signed in.
 */
function Screens() {
  const { ready, locked, wantsSignIn, clearWantsSignIn } = useAuth();
  const showApp = ready && !locked;

  // "Forgot PIN" on the lock screen signs out and lands here: open sign-in to choose a new PIN.
  useEffect(() => {
    if (!showApp || !wantsSignIn) return;
    clearWantsSignIn();
    router.push('/login');
  }, [showApp, wantsSignIn, clearWantsSignIn]);

  if (!ready) return <QueryState loading error={null} onRetry={() => {}} />;
  if (locked) return <LockScreen />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.brand800 },
        headerBackground: () => <GradientFill name="brand" direction="diagonal" />,
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '600' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.sand },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="packages/[id]" options={{ title: 'Package' }} />
      <Stack.Screen name="transport/[id]" options={{ title: 'Transport' }} />
      <Stack.Screen name="community/[id]" options={{ title: 'Discussion' }} />
      <Stack.Screen name="community/new" options={{ title: 'New post', presentation: 'modal' }} />
      <Stack.Screen name="login" options={{ title: 'Sign in or sign up', presentation: 'modal' }} />
      <Stack.Screen name="bookings" options={{ title: 'My bookings' }} />
      <Stack.Screen name="planner/new" options={{ title: 'Umrah plan', presentation: 'modal' }} />
      <Stack.Screen name="planner/[id]" options={{ title: 'Umrah planner' }} />
      <Stack.Screen name="provider/apply" options={{ title: 'Become a provider' }} />
      <Stack.Screen name="provider/index" options={{ title: 'Provider dashboard' }} />
      <Stack.Screen name="provider/listings" options={{ title: 'My listings' }} />
      <Stack.Screen name="provider/package-form" options={{ title: 'Package' }} />
      <Stack.Screen name="provider/service-form" options={{ title: 'Transport service' }} />
      <Stack.Screen name="provider/bookings" options={{ title: 'Bookings' }} />
      <Stack.Screen name="provider/profile" options={{ title: 'Company profile' }} />
    </Stack>
  );
}
