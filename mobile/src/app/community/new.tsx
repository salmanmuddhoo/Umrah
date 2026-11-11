import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { Button, Chips, Input, Notice, Screen } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { TOPICS } from '@/lib/constants';
import { validatePost } from '@/lib/validate';

const TOPIC_OPTIONS = TOPICS.map((t) => ({ value: t.slug as string, label: t.label as string }));

export default function NewPostScreen() {
  const { api, user, ready } = useAuth();
  const [topic, setTopic] = useState('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (ready && !user) return <Redirect href="/login" />;

  async function submit() {
    const problem = validatePost({ title, body, topic });
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      const post = await api.createPost({ title, body, topic });
      router.replace({ pathname: '/community/[id]', params: { id: post.id } });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Screen>
      {error ? <Notice>{error}</Notice> : null}
      <Chips label="Topic" options={TOPIC_OPTIONS} value={topic} onChange={setTopic} />
      <Input label="Title" value={title} onChangeText={setTitle} maxLength={200} />
      <Input label="Your post" value={body} onChangeText={setBody} multiline maxLength={10000} style={{ minHeight: 160 }} />
      <Button title="Post" onPress={submit} loading={saving} />
    </Screen>
  );
}
