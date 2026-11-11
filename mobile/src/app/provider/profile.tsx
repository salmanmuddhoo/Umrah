import { Redirect } from 'expo-router';
import { useState } from 'react';

import { Button, Input, Notice, Screen } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function ProfileScreen() {
  const { api, user, ready, refreshUser } = useAuth();
  const p = user?.provider;
  const [form, setForm] = useState({
    companyName: p?.companyName ?? '',
    description: p?.description ?? '',
    city: p?.city ?? '',
    country: p?.country ?? '',
    phone: p?.phone ?? '',
    licenseNo: p?.licenseNo ?? '',
  });
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const [notice, setNotice] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (ready && !p) return <Redirect href="/account" />;

  async function save() {
    if (form.companyName.trim().length < 2) return setNotice({ tone: 'error', text: 'Company name is required.' });
    setSaving(true);
    try {
      await api.updateProfile(form);
      await refreshUser();
      setNotice({ tone: 'ok', text: 'Profile saved.' });
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err) });
    }
    setSaving(false);
  }

  return (
    <Screen>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <Input label="Company name" value={form.companyName} onChangeText={set('companyName')} maxLength={120} />
      <Input label="About your company" hint="Shown to pilgrims on your listings." value={form.description} onChangeText={set('description')} multiline maxLength={2000} />
      <Input label="City" value={form.city} onChangeText={set('city')} maxLength={80} />
      <Input label="Country" value={form.country} onChangeText={set('country')} maxLength={80} />
      <Input label="Business phone" hint="Shared with customers once you confirm their booking." value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={40} />
      <Input label="Licence / registration number" value={form.licenseNo} onChangeText={set('licenseNo')} maxLength={80} />
      <Button title="Save profile" onPress={save} loading={saving} />
    </Screen>
  );
}
