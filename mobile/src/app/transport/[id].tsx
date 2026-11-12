import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { RatingSummary, Reviews } from '@/components/Reviews';
import { Body, Button, Card, H1, H2, Input, Muted, Notice, QueryState, Screen, styles } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { vehicleLabel } from '@/lib/constants';
import { money, plural } from '@/lib/format';
import { useQuery } from '@/lib/useQuery';
import { validateTransportBooking } from '@/lib/validate';
import { colors } from '@/theme';

export default function ServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user } = useAuth();
  const { data: service, error, loading, refreshing, reload } = useQuery(`service:${id}`, () => api.service(id));

  const [form, setForm] = useState({ date: '', time: '', pickupLocation: '', passengers: '1', contactPhone: '', notes: '' });
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!service) return <QueryState loading={loading} error={error} onRetry={reload} />;

  async function book() {
    const problem = validateTransportBooking(form, service!.capacity);
    setFormError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await api.bookTransport(service!.id, {
        pickupAt: `${form.date}T${form.time}`,
        pickupLocation: form.pickupLocation,
        passengers: form.passengers,
        contactPhone: form.contactPhone,
        notes: form.notes,
      });
      router.replace({ pathname: '/bookings', params: { booked: '1' } });
    } catch (err) {
      setFormError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {service.isPublic === false ? <Notice tone="warn">Preview only — pilgrims cannot see this service yet.</Notice> : null}
      <H1>{service.title}</H1>
      <RatingSummary average={service.ratingAverage} count={service.ratingCount} />
      <Muted>by {service.provider.companyName}</Muted>

      <Card>
        <View style={styles.wrap}>
          {[
            ['From', service.fromPlace],
            ['To', service.toPlace],
            ['Vehicle', vehicleLabel(service.vehicleType)],
            ['Capacity', plural(service.capacity, 'passenger')],
          ].map(([label, value]) => (
            <View key={label} style={{ flexBasis: '45%', flexGrow: 1 }}>
              <Muted>{label}</Muted>
              <Text style={[styles.body, { fontWeight: '600' }]}>{value}</Text>
            </View>
          ))}
        </View>
      </Card>

      {service.description ? <Body>{service.description}</Body> : null}
      {service.provider.description ? (
        <>
          <H2>About {service.provider.companyName}</H2>
          <Body>{service.provider.description}</Body>
        </>
      ) : null}

      <Card style={{ marginTop: 8 }}>
        <Text>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.brand800 }}>{money(service.priceCents)}</Text>
          <Text style={styles.muted}> per trip</Text>
        </Text>
        {service.isPublic === false ? (
          <Notice tone="warn">Not open for booking.</Notice>
        ) : !user ? (
          <Button title="Sign in to book" onPress={() => router.push('/login')} />
        ) : (
          <>
            {formError ? <Notice>{formError}</Notice> : null}
            <Input label="Pickup date" placeholder="YYYY-MM-DD" value={form.date} onChangeText={set('date')} keyboardType="numbers-and-punctuation" maxLength={10} autoCorrect={false} />
            <Input label="Pickup time" hint="Saudi Arabia local time, 24-hour." placeholder="HH:MM" value={form.time} onChangeText={set('time')} keyboardType="numbers-and-punctuation" maxLength={5} autoCorrect={false} />
            <Input label="Pickup location" hint="Terminal, hotel name or address." value={form.pickupLocation} onChangeText={set('pickupLocation')} maxLength={200} />
            <Input label="Passengers" value={form.passengers} onChangeText={set('passengers')} keyboardType="number-pad" maxLength={2} />
            <Input label="Contact phone" hint="Include your country code." placeholder="+44 7700 900000" value={form.contactPhone} onChangeText={set('contactPhone')} keyboardType="phone-pad" autoComplete="tel" />
            <Input label="Notes for the driver (optional)" placeholder="Flight number, luggage, child seats…" value={form.notes} onChangeText={set('notes')} multiline maxLength={1000} />
            <Button title="Request booking" onPress={book} loading={saving} />
            <Muted>No payment is taken now. The provider will confirm and arrange payment with you.</Muted>
          </>
        )}
      </Card>

      {service.isPublic !== false ? (
        <View style={{ marginTop: 8 }}>
          <Reviews kind="transport" listingId={service.id} canReview={user?.provider?.id !== service.provider.id} onChange={reload} />
        </View>
      ) : null}
    </Screen>
  );
}
