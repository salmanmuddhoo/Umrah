import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Chips, Input, Notice, QueryState, Screen, Toggle } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { VEHICLE_TYPES } from '@/lib/constants';
import { validateService, type ServiceForm } from '@/lib/validate';

const EMPTY: ServiceForm & { description: string } = { title: '', description: '', vehicleType: 'SEDAN', capacity: '', fromPlace: '', toPlace: '', price: '' };
const TYPES = VEHICLE_TYPES.map((v) => ({ value: v.value as string, label: v.label as string }));

export default function ServiceFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { api } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [active, setActive] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(!id);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .myServices()
      .then((list) => {
        if (cancelled) return;
        const s = list.find((x) => x.id === id);
        if (!s) return setLoadError('This service no longer exists.');
        setForm({ title: s.title, description: s.description, vehicleType: s.vehicleType, capacity: String(s.capacity), fromPlace: s.fromPlace, toPlace: s.toPlace, price: String(s.priceCents / 100) });
        setActive(s.active);
        setLoaded(true);
      })
      .catch((err) => !cancelled && setLoadError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  if (!loaded) return <QueryState loading error={loadError} onRetry={() => router.back()} />;

  async function save() {
    const problem = validateService(form);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await api.saveService(id ?? null, { ...form, active });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Screen>
      {error ? <Notice>{error}</Notice> : null}
      <Input label="Title" placeholder="Jeddah Airport to Makkah hotel — private GMC" value={form.title} onChangeText={set('title')} maxLength={120} />
      <Input label="From" placeholder="Jeddah Airport (JED)" value={form.fromPlace} onChangeText={set('fromPlace')} maxLength={120} />
      <Input label="To" placeholder="Makkah" value={form.toPlace} onChangeText={set('toPlace')} maxLength={120} />
      <Chips label="Vehicle type" options={TYPES} value={form.vehicleType} onChange={set('vehicleType')} />
      <Input label="Passenger capacity" value={form.capacity} onChangeText={set('capacity')} keyboardType="number-pad" maxLength={2} />
      <Input label="Price per trip (USD)" value={form.price} onChangeText={set('price')} keyboardType="decimal-pad" maxLength={8} />
      <Input label="Description (optional)" hint="Vehicle model, luggage allowance, waiting time, child seats." value={form.description} onChangeText={set('description')} multiline maxLength={2000} />
      <Toggle label="Open for booking" value={active} onChange={setActive} />
      <Button title={id ? 'Save changes' : 'Publish service'} onPress={save} loading={saving} />
    </Screen>
  );
}
