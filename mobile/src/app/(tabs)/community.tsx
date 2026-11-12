import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { VoteButtons } from '@/components/VoteButtons';
import { Button, Chips, Empty, Muted, QueryState, styles } from '@/components/ui';
import { Page } from '@/components/Gradient';
import { useAuth } from '@/lib/auth';
import { TOPICS, topicLabel } from '@/lib/constants';
import { plural, timeAgo } from '@/lib/format';
import { applyVote } from '@/lib/threads';
import type { Post } from '@/lib/types';
import { useQuery } from '@/lib/useQuery';
import { colors, space } from '@/theme';

const TOPIC_OPTIONS = [{ value: '', label: 'All' }, ...TOPICS.map((t) => ({ value: t.slug as string, label: t.label as string }))];
const SORTS = [
  { value: 'top', label: 'Top' },
  { value: 'new', label: 'New' },
] as const;

export default function CommunityScreen() {
  const { api, user } = useAuth();
  const [topic, setTopic] = useState('');
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const { data, setData, error, loading, refreshing, reload } = useQuery(`posts:${topic}:${sort}:${user?.id}`, () => api.posts({ topic, sort }));

  async function vote(post: Post, value: 1 | -1) {
    if (!user) return router.push('/login');
    const patch = (next: { score: number; myVote: number }) => setData((posts) => posts?.map((p) => (p.id === post.id ? { ...p, ...next } : p)) ?? null);
    patch(applyVote(post, value)); // show the result straight away
    try {
      patch(await api.vote(post.id, value));
    } catch {
      patch({ score: post.score, myVote: post.myVote });
    }
  }

  return (
    <Page>
      <FlatList
        style={styles.screen}
        contentContainerStyle={styles.listContent}
        data={data ?? []}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.brand700} />}
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            <View style={styles.between}>
              <Muted style={{ flex: 1 }}>Questions, advice and experiences from fellow pilgrims.</Muted>
              <Button title="New post" small onPress={() => router.push(user ? '/community/new' : '/login')} />
            </View>
            <Chips options={TOPIC_OPTIONS} value={topic} onChange={setTopic} />
            <Chips options={SORTS} value={sort} onChange={setSort} />
            {!data ? <QueryState loading={loading} error={error} onRetry={reload} /> : null}
          </View>
        }
        ListEmptyComponent={data ? <Empty>Nothing here yet. Be the first to start a discussion.</Empty> : undefined}
        renderItem={({ item }) => (
          <View style={[styles.card, { flexDirection: 'row', gap: space.md }]}>
            <VoteButtons score={item.score} myVote={item.myVote} onVote={(v) => vote(item, v)} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              style={{ flex: 1, gap: 4 }}
              onPress={() => router.push({ pathname: '/community/[id]', params: { id: item.id } })}>
              <Muted>
                <Text style={{ color: colors.brand700, fontWeight: '600' }}>{topicLabel(item.topic)}</Text> · {item.authorName} · {timeAgo(item.createdAt)}
              </Muted>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{item.title}</Text>
              <Text numberOfLines={2} style={styles.muted}>
                {item.body}
              </Text>
              <Muted>{plural(item.commentCount, 'comment')}</Muted>
            </Pressable>
          </View>
        )}
      />
    </Page>
  );
}
