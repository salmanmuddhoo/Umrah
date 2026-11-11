import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Empty, Muted, Notice, QueryState, Screen, StatusBadge, styles } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { date, money, plural, saudiDateTime, timeAgo } from '@/lib/format';
import type { ProviderBooking } from '@/lib/types';
import { useQuery } from '@/lib/useQuery';
import { colors, space } from '@/theme';

function detail(b: ProviderBooking) {
  if (b.kind === 'package') return `Departs ${date(b.departureDate ?? '')} · ${plural(b.travellers ?? 0, 'traveller')}`;
  return `${saudiDateTime(b.pickupAt ?? '')} (Saudi time) · pickup: ${b.pickupLocation} · ${plural(b.passengers ?? 0, 'passenger')}`;
}

export default function ProviderBookingsScreen() {
  const { api, user, ready } = useAuth();
  const { data, error, loading, refreshing, reload } = useQuery(`provider-bookings:${user?.id}`, () => api.providerBookings());
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (ready && !user?.provider) return <Redirect href="/account" />;
  if (!data) return <QueryState loading={loading} error={error} onRetry={reload} />;

  async function move(b: ProviderBooking, to: string) {
    setBusy(b.id);
    try {
      await api.setBookingStatus(b.kind, b.id, to);
      setActionError(null);
    } catch (err) {
      setActionError(errorMessage(err));
    }
    setBusy(null);
    reload();
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {actionError ? <Notice>{actionError}</Notice> : null}
      {data.length === 0 ? <Empty>No bookings yet. They will appear here as soon as a pilgrim books.</Empty> : null}

      {data.map((b) => (
        <Card key={b.id}>
          <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
            <Text style={[styles.body, { flex: 1, fontWeight: '600' }]}>{b.title}</Text>
            <StatusBadge status={b.status} />
          </View>
          <Muted>{detail(b)}</Muted>
          <Text style={styles.body}>
            <Text style={{ fontWeight: '600' }}>{b.customerName}</Text> · {b.contactPhone}
          </Text>
          <Muted>
            {b.customerEmail} · requested {timeAgo(b.createdAt)}
          </Muted>
          {b.notes ? (
            <View style={{ backgroundColor: colors.sand, borderRadius: 8, padding: space.sm }}>
              <Muted>“{b.notes}”</Muted>
            </View>
          ) : null}
          <Muted>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{money(b.totalCents)}</Text> · commission {money(b.commissionCents)} · you receive{' '}
            {money(b.totalCents - b.commissionCents)}
          </Muted>
          {b.status === 'PENDING' ? (
            <View style={styles.row}>
              <Button title="Confirm" small loading={busy === b.id} onPress={() => move(b, 'CONFIRMED')} />
              <Button title="Decline" variant="danger" small disabled={busy === b.id} onPress={() => move(b, 'CANCELLED')} />
            </View>
          ) : null}
          {b.status === 'CONFIRMED' ? (
            <View style={styles.row}>
              <Button title="Mark completed" variant="ghost" small loading={busy === b.id} onPress={() => move(b, 'COMPLETED')} />
              <Button title="Cancel" variant="danger" small disabled={busy === b.id} onPress={() => move(b, 'CANCELLED')} />
            </View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
