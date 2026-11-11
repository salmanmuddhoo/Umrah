import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Body, Button, Card, H1, H2, Muted, QueryState, Screen, StatusBadge, styles } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

export default function AccountScreen() {
  const { user, ready, signOut } = useAuth();
  if (!ready) return <QueryState loading error={null} onRetry={() => {}} />;

  if (!user) {
    return (
      <Screen>
        <H1>Welcome to My Ummah</H1>
        <Body>Sign in to book packages and transport, keep track of your bookings and join the community.</Body>
        <Button title="Sign in or create an account" onPress={() => router.push('/login')} />
        <Muted>Use your email address or phone number. We send a code by email or WhatsApp, then you choose a 4-digit PIN.</Muted>

        <Card style={{ marginTop: 16, backgroundColor: colors.brand50 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.brand900 }}>Umrah operator or transport company?</Text>
          <Muted>List your packages or fleet for free and receive bookings from pilgrims worldwide. We only charge a commission on bookings you confirm.</Muted>
          <Button title="Register as an Umrah provider" variant="ghost" onPress={() => router.push({ pathname: '/login', params: { as: 'umrah' } })} />
          <Button title="Register as a transport provider" variant="ghost" onPress={() => router.push({ pathname: '/login', params: { as: 'transport' } })} />
        </Card>
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

      {user.provider ? (
        <Card style={{ marginTop: 8 }}>
          <View style={styles.between}>
            <H2>{user.provider.companyName}</H2>
            <StatusBadge status={user.provider.status} />
          </View>
          <Muted>{user.provider.type === 'UMRAH' ? 'Umrah provider' : 'Transport provider'}</Muted>
          <Button title="Open provider dashboard" variant="gold" onPress={() => router.push('/provider')} />
        </Card>
      ) : null}

      <Button title="Sign out" variant="ghost" style={{ marginTop: 16 }} onPress={() => void signOut()} />
    </Screen>
  );
}
