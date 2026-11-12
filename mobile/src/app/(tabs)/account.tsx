import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Body, Button, Card, H1, H2, Muted, QueryState, Screen, StatusBadge, styles } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { providerTypeLabel } from '@/lib/constants';
import { colors } from '@/theme';

export default function AccountScreen() {
  const { user, ready, signOut } = useAuth();
  if (!ready) return <QueryState loading error={null} onRetry={() => {}} />;

  if (!user) {
    return (
      <Screen>
        <H1>Welcome to One Ummah</H1>
        <Body>Sign in to book packages and transport, keep track of your bookings and join the community.</Body>
        <Button title="Sign in or create an account" onPress={() => router.push('/login')} />
        <Muted>Use your email address or phone number. We send a code by email or WhatsApp, then you choose a 4-digit PIN.</Muted>

        <ProviderInvite />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.brand900 }}>{user.name}</Text>
        <Muted>{user.email ?? user.phone}</Muted>
      </Card>

      <Button title="My bookings" onPress={() => router.push('/bookings')} />
      <Button title="My Umrah planner" variant="ghost" onPress={() => router.navigate('/planner')} />

      {user.provider ? (
        <Card style={{ marginTop: 8 }}>
          <View style={styles.between}>
            <H2>{user.provider.companyName}</H2>
            <StatusBadge status={user.provider.status} />
          </View>
          <Muted>Service provider · {providerTypeLabel(user.provider.type)}</Muted>
          <Button title="Open provider dashboard" variant="gold" onPress={() => router.push('/provider')} />
        </Card>
      ) : null}

      {!user.provider ? <ProviderInvite /> : null}

      <Button title="Sign out" variant="ghost" style={{ marginTop: 16 }} onPress={() => void signOut()} />
    </Screen>
  );
}

/** One door for every kind of service provider; the service is chosen on the next screen. */
function ProviderInvite() {
  return (
    <Card style={{ marginTop: 16, backgroundColor: colors.brand50 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.brand900 }}>Do you serve pilgrims?</Text>
      <Muted>Umrah operators, transport, hotels, catering, guides and more can list with One Ummah for free. Choose the service you offer and apply.</Muted>
      <Button title="Become a service provider" variant="gold" onPress={() => router.push('/provider/apply')} />
    </Card>
  );
}
