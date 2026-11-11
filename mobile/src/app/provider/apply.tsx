import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { FadeInUp, PressableScale, stagger } from '@/components/motion';
import { Body, Button, H1, Input, Muted, Notice, Screen } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PROVIDER_TYPES, providerType } from '@/lib/constants';
import { colors, radius, space } from '@/theme';

/**
 * The one way in for every kind of service provider: choose the service you
 * offer, then give your company details. New kinds of service only need a
 * line in PROVIDER_TYPES to appear here.
 */
export default function ApplyScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const { api, user, refreshUser } = useAuth();
  const [type, setType] = useState(providerType(params.type)?.value ?? null);
  const [form, setForm] = useState({ companyName: '', description: '', city: '', country: '', phone: '', licenseNo: '' });
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (user?.provider) return <Redirect href="/provider" />;
  const chosen = providerType(type);

  function choose(value: string) {
    // Without an account yet, the company details are collected while signing up.
    if (!user) router.push({ pathname: '/login', params: { as: value } });
    else setType(value as typeof type);
  }

  async function submit() {
    if (form.companyName.trim().length < 2) return setError('Please enter your company name.');
    setSaving(true);
    try {
      await api.applyAsProvider({ ...form, type: chosen!.value });
      await refreshUser();
      router.replace('/provider');
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  if (!chosen) {
    return (
      <Screen>
        <H1>Provide a service</H1>
        <Body>Reach pilgrims planning their Umrah. Choose the service you want to offer. Listing is free; we review every provider before they go live.</Body>
        {PROVIDER_TYPES.map((t, i) => (
          <FadeInUp key={t.value} delay={stagger(i)}>
            <PressableScale accessibilityRole="button" accessibilityLabel={t.label} onPress={() => choose(t.value)} style={option}>
              <View style={iconWrap}>
                <Ionicons name={t.icon} size={22} color={colors.brand700} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.brand900 }}>{t.label}</Text>
                <Muted>{t.description}</Muted>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </PressableScale>
          </FadeInUp>
        ))}
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>{chosen.label}</H1>
      <Muted>{chosen.description}</Muted>
      {chosen.listings === null ? (
        <Notice tone="warn">You can apply now and we will review your business. The tools for listing {chosen.label.toLowerCase()} in the app are coming soon.</Notice>
      ) : null}
      {error ? <Notice>{error}</Notice> : null}
      <Input label="Company name" value={form.companyName} onChangeText={set('companyName')} maxLength={120} />
      <Input label="About your company" hint="Shown to pilgrims on your listings." value={form.description} onChangeText={set('description')} multiline maxLength={2000} />
      <Input label="City" value={form.city} onChangeText={set('city')} maxLength={80} />
      <Input label="Country" value={form.country} onChangeText={set('country')} maxLength={80} />
      <Input label="Business phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={40} />
      <Input label="Licence / registration number" hint="Helps us verify your business faster." value={form.licenseNo} onChangeText={set('licenseNo')} maxLength={80} />
      <Button title="Submit application" onPress={submit} loading={saving} />
      <Button title="Choose a different service" variant="ghost" onPress={() => setType(null)} />
    </Screen>
  );
}

const option = { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.white, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: '#0000000d' } as const;
const iconWrap = { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' } as const;
