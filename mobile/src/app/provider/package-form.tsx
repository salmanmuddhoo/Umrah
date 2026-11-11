import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Button, Chips, Input, Notice, QueryState, Screen, Toggle, styles } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { INCLUSIONS } from '@/lib/constants';
import { isoDay } from '@/lib/format';
import { validatePackage, type PackageForm } from '@/lib/validate';

const STARS = ['5', '4', '3', '2', '1'].map((n) => ({ value: n, label: `${n}★` }));
const EMPTY: PackageForm = {
  title: '', description: '', departureCity: '', departureDate: '', durationDays: '', makkahHotel: '', makkahNights: '',
  madinahHotel: '', madinahNights: '', hotelStars: '4', price: '', seatsTotal: '',
};
const NO_FLAGS = { incFlights: false, incVisa: false, incMeals: false, incTransport: false, incZiyarah: false, active: true };

export default function PackageFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { api } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [flags, setFlags] = useState(NO_FLAGS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(!id);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof PackageForm) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Editing: fill the form from the provider's own copy of the package.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .myPackages()
      .then((list) => {
        if (cancelled) return;
        const p = list.find((x) => x.id === id);
        if (!p) return setLoadError('This package no longer exists.');
        setForm({
          title: p.title, description: p.description, departureCity: p.departureCity, departureDate: isoDay(p.departureDate),
          durationDays: String(p.durationDays), makkahHotel: p.makkahHotel, makkahNights: String(p.makkahNights),
          madinahHotel: p.madinahHotel, madinahNights: String(p.madinahNights), hotelStars: String(p.hotelStars),
          price: String(p.priceCents / 100), seatsTotal: String(p.seatsTotal),
        });
        setFlags({ incFlights: p.incFlights, incVisa: p.incVisa, incMeals: p.incMeals, incTransport: p.incTransport, incZiyarah: p.incZiyarah, active: p.active });
        setLoaded(true);
      })
      .catch((err) => !cancelled && setLoadError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  if (!loaded) return <QueryState loading error={loadError} onRetry={() => router.back()} />;

  async function save() {
    const problem = validatePackage(form);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await api.savePackage(id ?? null, { ...form, ...flags });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Screen>
      {error ? <Notice>{error}</Notice> : null}
      <Input label="Title" placeholder="14-day Ramadan Umrah, 5★ hotels" value={form.title} onChangeText={set('title')} maxLength={120} />
      <Input label="Description" hint="Itinerary, group leader, distance of hotels from the Haram, what is not included." value={form.description} onChangeText={set('description')} multiline maxLength={4000} style={{ minHeight: 130 }} />
      <Input label="Departure city" value={form.departureCity} onChangeText={set('departureCity')} maxLength={80} />
      <Input label="Departure date" placeholder="YYYY-MM-DD" value={form.departureDate} onChangeText={set('departureDate')} keyboardType="numbers-and-punctuation" maxLength={10} autoCorrect={false} />
      <Input label="Duration (days)" value={form.durationDays} onChangeText={set('durationDays')} keyboardType="number-pad" maxLength={2} />
      <Input label="Makkah hotel" value={form.makkahHotel} onChangeText={set('makkahHotel')} maxLength={120} />
      <Input label="Nights in Makkah" value={form.makkahNights} onChangeText={set('makkahNights')} keyboardType="number-pad" maxLength={2} />
      <Input label="Madinah hotel (optional)" value={form.madinahHotel} onChangeText={set('madinahHotel')} maxLength={120} />
      <Input label="Nights in Madinah" value={form.madinahNights} onChangeText={set('madinahNights')} keyboardType="number-pad" maxLength={2} />
      <Chips label="Hotel rating" options={STARS} value={form.hotelStars} onChange={set('hotelStars')} />
      <Input label="Price per person (USD)" value={form.price} onChangeText={set('price')} keyboardType="decimal-pad" maxLength={9} />
      <Input label="Total seats" value={form.seatsTotal} onChangeText={set('seatsTotal')} keyboardType="number-pad" maxLength={4} />

      <Text style={styles.label}>Included in the price</Text>
      {INCLUSIONS.map(([key, label]) => (
        <Toggle key={key} label={label} value={flags[key]} onChange={(v) => setFlags((f) => ({ ...f, [key]: v }))} />
      ))}
      <Toggle label="Open for booking" value={flags.active} onChange={(v) => setFlags((f) => ({ ...f, active: v }))} />

      <Button title={id ? 'Save changes' : 'Publish package'} onPress={save} loading={saving} />
    </Screen>
  );
}
