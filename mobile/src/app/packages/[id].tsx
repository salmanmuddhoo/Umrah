import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { RatingSummary, Reviews } from '@/components/Reviews';
import { Badge, Body, Button, Card, H1, H2, Input, Muted, Notice, QueryState, Screen, Stars, styles } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { inclusions } from '@/lib/constants';
import { date, money, plural } from '@/lib/format';
import { useQuery } from '@/lib/useQuery';
import { validatePackageBooking } from '@/lib/validate';
import { colors } from '@/theme';

export default function PackageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user } = useAuth();
  const { data: pkg, error, loading, refreshing, reload } = useQuery(`package:${id}`, () => api.package(id));

  const [travellers, setTravellers] = useState('1');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!pkg) return <QueryState loading={loading} error={error} onRetry={reload} />;

  const departed = pkg.departed === true;
  const bookable = pkg.isPublic !== false && !departed && pkg.seatsLeft > 0;
  const included = inclusions(pkg);
  const count = /^\d+$/.test(travellers) ? Number(travellers) : 0;

  async function book() {
    const problem = validatePackageBooking({ travellers, contactPhone }, pkg!.seatsLeft);
    setFormError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await api.bookPackage(pkg!.id, { travellers, contactPhone, notes });
      router.replace({ pathname: '/bookings', params: { booked: '1' } });
    } catch (err) {
      setFormError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {pkg.isPublic === false ? <Notice tone="warn">Preview only — pilgrims cannot see this package yet.</Notice> : null}
      <H1>{pkg.title}</H1>
      <RatingSummary average={pkg.ratingAverage} count={pkg.ratingCount} />
      <Muted>
        by {pkg.provider.companyName}
        {pkg.provider.city ? ` · ${[pkg.provider.city, pkg.provider.country].filter(Boolean).join(', ')}` : ''}
      </Muted>

      <Card>
        <View style={styles.wrap}>
          {[
            ['Departs', date(pkg.departureDate)],
            ['From', pkg.departureCity],
            ['Duration', `${pkg.durationDays} days`],
            ['Seats left', pkg.seatsLeft > 0 ? String(pkg.seatsLeft) : 'Fully booked'],
          ].map(([label, value]) => (
            <View key={label} style={{ flexBasis: '45%', flexGrow: 1 }}>
              <Muted>{label}</Muted>
              <Text style={[styles.body, { fontWeight: '600' }]}>{value}</Text>
            </View>
          ))}
        </View>
      </Card>

      <H2>Where you will stay</H2>
      <Card>
        <Muted>Makkah · {plural(pkg.makkahNights, 'night')}</Muted>
        <Text style={[styles.body, { fontWeight: '600' }]}>{pkg.makkahHotel}</Text>
        <Stars n={pkg.hotelStars} />
      </Card>
      {pkg.madinahNights > 0 ? (
        <Card>
          <Muted>Madinah · {plural(pkg.madinahNights, 'night')}</Muted>
          <Text style={[styles.body, { fontWeight: '600' }]}>{pkg.madinahHotel}</Text>
        </Card>
      ) : null}

      <H2>What is included</H2>
      {included.length > 0 ? (
        <View style={styles.wrap}>
          {included.map((label) => (
            <Badge key={label}>✓ {label}</Badge>
          ))}
        </View>
      ) : (
        <Muted>Accommodation only.</Muted>
      )}

      <H2>About this package</H2>
      <Body>{pkg.description}</Body>

      {pkg.provider.description ? (
        <>
          <H2>About {pkg.provider.companyName}</H2>
          <Body>{pkg.provider.description}</Body>
          {pkg.provider.licenseNo ? <Muted>Licence no. {pkg.provider.licenseNo}</Muted> : null}
        </>
      ) : null}

      <Card style={{ marginTop: 8 }}>
        <Text>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.brand800 }}>{money(pkg.priceCents)}</Text>
          <Text style={styles.muted}> per person</Text>
        </Text>
        {!bookable ? (
          <Notice tone="warn">
            {pkg.isPublic === false ? 'Not open for booking.' : departed ? 'This package has departed.' : 'This package is fully booked.'}
          </Notice>
        ) : !user ? (
          <Button title="Sign in to book" onPress={() => router.push('/login')} />
        ) : (
          <>
            {formError ? <Notice>{formError}</Notice> : null}
            <Input label="Travellers" value={travellers} onChangeText={setTravellers} keyboardType="number-pad" maxLength={2} />
            <Input
              label="Contact phone"
              hint="Include your country code."
              placeholder="+44 7700 900000"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <Input label="Notes for the provider (optional)" placeholder="Wheelchair needs, room preferences…" value={notes} onChangeText={setNotes} multiline maxLength={1000} />
            {count > 0 ? <Body>Total: {money(pkg.priceCents * count)}</Body> : null}
            <Button title="Request booking" onPress={book} loading={saving} />
            <Muted>No payment is taken now. {pkg.provider.companyName} will confirm your booking and arrange payment with you.</Muted>
          </>
        )}
      </Card>

      {pkg.isPublic !== false ? (
        <View style={{ marginTop: 8 }}>
          <Reviews kind="package" listingId={pkg.id} canReview={user?.provider?.id !== pkg.provider.id} onChange={reload} />
        </View>
      ) : null}
    </Screen>
  );
}
