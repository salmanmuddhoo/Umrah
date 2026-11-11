import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Input, Muted, Notice, Screen } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { validateLogin } from '@/lib/validate';

export default function LoginScreen() {
  const { api, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const problem = validateLogin({ email, password });
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await signIn(await api.login({ email: email.trim(), password }));
      // Return to whatever the person was doing (a package they wanted to book, a post to comment on).
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Screen>
      {error ? <Notice>{error}</Notice> : null}
      <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={submit} />
      <Button title="Sign in" onPress={submit} loading={saving} />
      <Muted style={{ textAlign: 'center', marginTop: 8 }}>New here?</Muted>
      <Button title="Create an account" variant="ghost" onPress={() => router.replace('/register')} />
    </Screen>
  );
}
