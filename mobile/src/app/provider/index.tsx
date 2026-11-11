import { Redirect, router } from 'expo-router';
import { View } from 'react-native';

import { Body, Button, Card, H1, H2, Muted, Notice, QueryState, Screen, Stat, styles } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { money, plural } from '@/lib/format';
import { useQuery } from '@/lib/useQuery';

export default function ProviderDashboard() {
  const { api, user, ready } = useAuth();
  const { data, error, loading, refreshing, reload } = useQuery(`dashboard:${user?.id}`, () => api.providerDashboard());

  if (ready && !user?.provider) return <Redirect href="/account" />;
  if (!data) return <QueryState loading={loading} error={error} onRetry={reload} />;

  const { provider, stats, commissionRate } = data;
  const isUmrah = provider.type === 'UMRAH';

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Muted>{isUmrah ? 'UMRAH PROVIDER' : 'TRANSPORT PROVIDER'}</Muted>
      <H1>{provider.companyName}</H1>

      {provider.status === 'PENDING' ? (
        <Notice tone="warn">Your account is awaiting approval. You can set up your listings now — they will go live as soon as we have verified your business.</Notice>
      ) : null}
      {provider.status === 'SUSPENDED' ? <Notice>Your account is suspended and your listings are hidden. Please contact support.</Notice> : null}

      <View style={styles.wrap}>
        <Stat label={isUmrah ? 'Active packages' : 'Active services'} value={stats.listings} />
        <Stat label="Requests awaiting you" value={stats.pending} />
        <Stat label="Confirmed sales" value={money(stats.grossCents)} hint={plural(stats.confirmed, 'booking')} />
        <Stat label="Your earnings" value={money(stats.netCents)} hint={`After ${money(stats.commissionCents)} commission`} />
      </View>

      <Button title={stats.pending > 0 ? `Review bookings (${stats.pending} waiting)` : 'Bookings'} onPress={() => router.push('/provider/bookings')} />
      <Button title={isUmrah ? 'My packages' : 'My services'} variant="ghost" onPress={() => router.push('/provider/listings')} />
      <Button title="Company profile" variant="ghost" onPress={() => router.push('/provider/profile')} />

      <Card style={{ marginTop: 8 }}>
        <H2>How billing works</H2>
        <Body>
          Listing is free. My Ummah charges {commissionRate}% commission on each booking you confirm. The rate is fixed when the pilgrim
          books, and cancelled bookings are never charged.
        </Body>
      </Card>
    </Screen>
  );
}
