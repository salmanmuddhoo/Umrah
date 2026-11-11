import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Badge, Button, Card, confirm, Empty, Muted, Notice, QueryState, Screen, styles } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { vehicleLabel } from '@/lib/constants';
import { date, money, plural } from '@/lib/format';
import type { MyPackage, MyService } from '@/lib/types';
import { useQuery } from '@/lib/useQuery';

export default function ListingsScreen() {
  const { api, user, ready } = useAuth();
  const isUmrah = user?.provider?.type === 'UMRAH';
  const { data, error, loading, refreshing, reload } = useQuery<(MyPackage | MyService)[]>(`listings:${user?.id}:${isUmrah}`, () => (isUmrah ? api.myPackages() : api.myServices()));
  const [notice, setNotice] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);

  if (ready && !user?.provider) return <Redirect href="/account" />;
  if (!data) return <QueryState loading={loading} error={error} onRetry={reload} />;

  const form = isUmrah ? '/provider/package-form' : '/provider/service-form';
  const noun = isUmrah ? 'package' : 'service';

  const remove = (id: string, title: string) =>
    confirm(`Delete “${title}”?`, `If this ${noun} has open bookings it will be hidden instead, so pilgrims keep their record.`, 'Delete', async () => {
      try {
        const res = isUmrah ? await api.deletePackage(id) : await api.deleteService(id);
        setNotice(res.hidden ? { tone: 'ok', text: `“${title}” has open bookings, so it was hidden rather than deleted.` } : null);
      } catch (err) {
        setNotice({ tone: 'error', text: errorMessage(err) });
      }
      reload();
    });

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Button title={`Add a ${noun}`} onPress={() => router.push(form)} />
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {data.length === 0 ? <Empty>You have not listed any {noun}s yet.</Empty> : null}

      {data.map((item) => (
        <Card key={item.id}>
          <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
            <Text style={[styles.body, { flex: 1, fontWeight: '600' }]}>{item.title}</Text>
            <Badge tone={item.active ? 'brand' : 'slate'}>{item.active ? 'Open' : 'Hidden'}</Badge>
          </View>
          {'seatsBooked' in item ? (
            <Muted>
              Departs {date(item.departureDate)} · {money(item.priceCents)} per person · {item.seatsBooked} of {plural(item.seatsTotal, 'seat')} sold
            </Muted>
          ) : (
            <Muted>
              {item.fromPlace} → {item.toPlace} · {vehicleLabel(item.vehicleType)} · {money(item.priceCents)} per trip · {plural(item.bookingCount, 'booking')}
            </Muted>
          )}
          <View style={styles.row}>
            <Button title="Edit" variant="ghost" small onPress={() => router.push({ pathname: form, params: { id: item.id } })} />
            <Button
              title="Preview"
              variant="ghost"
              small
              onPress={() => router.push({ pathname: isUmrah ? '/packages/[id]' : '/transport/[id]', params: { id: item.id } })}
            />
            <Button title="Delete" variant="danger" small onPress={() => remove(item.id, item.title)} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
