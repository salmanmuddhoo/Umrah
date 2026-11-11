import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, confirm, Empty, H2, Muted, Notice, QueryState, Screen, StatusBadge, styles } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { date, money, plural, saudiDateTime } from '@/lib/format';
import { useQuery } from '@/lib/useQuery';

const canCancel = (status: string) => status === 'PENDING' || status === 'CONFIRMED';

export default function BookingsScreen() {
  const { booked } = useLocalSearchParams<{ booked?: string }>();
  const { api, user, ready } = useAuth();
  const { data, error, loading, refreshing, reload } = useQuery(`bookings:${user?.id}`, () => api.myBookings());
  const [actionError, setActionError] = useState<string | null>(null);

  if (ready && !user) return <Redirect href="/login" />;
  if (!data) return <QueryState loading={loading} error={error} onRetry={reload} />;

  const cancel = (kind: 'package' | 'transport', id: string) =>
    confirm('Cancel this booking?', 'The provider will be told you no longer need it.', 'Cancel booking', async () => {
      try {
        await api.setBookingStatus(kind, id, 'CANCELLED');
        setActionError(null);
      } catch (err) {
        setActionError(errorMessage(err));
      }
      reload();
    });

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {booked ? <Notice tone="ok">Your booking request has been sent. The provider will confirm it and contact you about payment.</Notice> : null}
      {actionError ? <Notice>{actionError}</Notice> : null}

      <H2>Umrah packages</H2>
      {data.packages.length === 0 ? (
        <Empty>No package bookings yet.</Empty>
      ) : (
        data.packages.map((b) => (
          <Card key={b.id}>
            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
              <Text style={[styles.body, { flex: 1, fontWeight: '600' }]}>{b.title}</Text>
              <StatusBadge status={b.status} />
            </View>
            <Muted>
              Departs {date(b.departureDate)} · {plural(b.travellers, 'traveller')} · {b.providerName}
            </Muted>
            {b.providerPhone ? <Muted>Provider phone: {b.providerPhone}</Muted> : null}
            <View style={styles.between}>
              <Text style={[styles.body, { fontWeight: '700' }]}>{money(b.totalCents)}</Text>
              {canCancel(b.status) ? <Button title="Cancel" variant="danger" small onPress={() => cancel('package', b.id)} /> : null}
            </View>
          </Card>
        ))
      )}

      <H2>Transport</H2>
      {data.transport.length === 0 ? (
        <Empty>No transport bookings yet.</Empty>
      ) : (
        data.transport.map((b) => (
          <Card key={b.id}>
            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
              <Text style={[styles.body, { flex: 1, fontWeight: '600' }]}>
                {b.fromPlace} → {b.toPlace}
              </Text>
              <StatusBadge status={b.status} />
            </View>
            <Muted>
              {saudiDateTime(b.pickupAt)} (Saudi time) · {b.pickupLocation}
            </Muted>
            <Muted>
              {plural(b.passengers, 'passenger')} · {b.providerName}
            </Muted>
            {b.providerPhone ? <Muted>Provider phone: {b.providerPhone}</Muted> : null}
            <View style={styles.between}>
              <Text style={[styles.body, { fontWeight: '700' }]}>{money(b.totalCents)}</Text>
              {canCancel(b.status) ? <Button title="Cancel" variant="danger" small onPress={() => cancel('transport', b.id)} /> : null}
            </View>
          </Card>
        ))
      )}

      {data.packages.length + data.transport.length === 0 ? <Button title="Browse packages" onPress={() => router.replace('/umrah')} /> : null}
    </Screen>
  );
}
