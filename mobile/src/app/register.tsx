import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Chips, Input, Muted, Notice, Screen } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { validateRegister } from '@/lib/validate';

const KINDS = [
  { value: 'pilgrim', label: 'Pilgrim' },
  { value: 'umrah', label: 'Umrah provider' },
  { value: 'transport', label: 'Transport provider' },
] as const;
type Kind = (typeof KINDS)[number]['value'];

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ as?: string }>();
  const { api, signIn } = useAuth();
  const [as, setAs] = useState<Kind>(params.as === 'umrah' || params.as === 'transport' ? params.as : 'pilgrim');
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '', city: '', country: '', phone: '', licenseNo: '' });
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isProvider = as !== 'pilgrim';

  async function submit() {
    const problem = validateRegister({ ...form, as });
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await signIn(await api.register({ ...form, email: form.email.trim(), as }));
      if (isProvider) router.replace('/provider');
      else if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Screen>
      {error ? <Notice>{error}</Notice> : null}
      <Chips label="I am a" options={KINDS} value={as} onChange={setAs} />
      {isProvider ? <Muted>We review every provider before their listings go live.</Muted> : null}
      <Input label="Your name" value={form.name} onChangeText={set('name')} autoComplete="name" maxLength={80} />
      <Input label="Email" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
      <Input label="Password" hint="At least 8 characters." value={form.password} onChangeText={set('password')} secureTextEntry autoComplete="new-password" />
      {isProvider ? (
        <>
          <Input label="Company name" value={form.companyName} onChangeText={set('companyName')} maxLength={120} />
          <Input label="City" value={form.city} onChangeText={set('city')} maxLength={80} />
          <Input label="Country" value={form.country} onChangeText={set('country')} maxLength={80} />
          <Input label="Business phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={40} />
          <Input label="Licence / registration number" hint="Helps us verify your business faster." value={form.licenseNo} onChangeText={set('licenseNo')} maxLength={80} />
        </>
      ) : null}
      <Button title="Create account" onPress={submit} loading={saving} />
      <Button title="I already have an account" variant="ghost" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
