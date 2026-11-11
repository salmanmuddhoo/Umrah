import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Input, Muted, Notice, QueryState, Screen } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isoDay } from '@/lib/format';
import { validatePlan } from '@/lib/planner';

/** Creates a plan, or edits one's trip details when opened with `?id=`. */
export default function PlanFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { api, user } = useAuth();
  const [form, setForm] = useState({ title: '', departDate: '', returnDate: '', travellers: '1', notes: '' });
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const [loaded, setLoaded] = useState(!id);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .plan(id)
      .then((p) => {
        if (cancelled) return;
        setForm({ title: p.title, departDate: p.departDate ? isoDay(p.departDate) : '', returnDate: p.returnDate ? isoDay(p.returnDate) : '', travellers: String(p.travellers), notes: p.notes });
        setLoaded(true);
      })
      .catch((err) => !cancelled && setLoadError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  if (!user) return <Redirect href="/login" />;
  if (!loaded) return <QueryState loading error={loadError} onRetry={() => router.back()} />;

  async function save() {
    const problem = validatePlan(form);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      const plan = await api.savePlan(id ?? null, form);
      if (id) router.back();
      else router.replace({ pathname: '/planner/[id]', params: { id: plan.id } });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Screen>
      {error ? <Notice>{error}</Notice> : null}
      <Input label="Plan name" placeholder="Family Umrah, Ramadan 1448" value={form.title} onChangeText={set('title')} maxLength={80} />
      <Input label="Departure date (optional)" placeholder="YYYY-MM-DD" value={form.departDate} onChangeText={set('departDate')} keyboardType="numbers-and-punctuation" maxLength={10} autoCorrect={false} />
      <Input label="Return date (optional)" placeholder="YYYY-MM-DD" value={form.returnDate} onChangeText={set('returnDate')} keyboardType="numbers-and-punctuation" maxLength={10} autoCorrect={false} />
      <Input label="Travellers" value={form.travellers} onChangeText={set('travellers')} keyboardType="number-pad" maxLength={2} />
      <Input label="Notes (optional)" placeholder="Budget, who is coming, things to remember…" value={form.notes} onChangeText={set('notes')} multiline maxLength={2000} />
      {!id ? <Muted>We will add a ready-made checklist covering every stage of the trip. You can tick, add and remove items afterwards.</Muted> : null}
      <Button title={id ? 'Save changes' : 'Create plan'} onPress={save} loading={saving} />
    </Screen>
  );
}
