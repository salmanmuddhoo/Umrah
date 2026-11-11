import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { VoteButtons } from '@/components/VoteButtons';
import { Body, Button, Card, confirm, H2, Input, Muted, Notice, QueryState, Screen, styles } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { topicLabel } from '@/lib/constants';
import { plural, timeAgo } from '@/lib/format';
import { applyVote, threadComments } from '@/lib/threads';
import { useQuery } from '@/lib/useQuery';
import { colors, space } from '@/theme';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user } = useAuth();
  const { data: post, setData, error, loading, refreshing, reload } = useQuery(`post:${id}:${user?.id}`, () => api.post(id));

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!post) return <QueryState loading={loading} error={error} onRetry={reload} />;
  const canModerate = (authorId: string) => !!user && (user.id === authorId || user.role === 'ADMIN');

  async function vote(value: 1 | -1) {
    if (!user) return router.push('/login');
    const before = { score: post!.score, myVote: post!.myVote };
    setData((p) => p && { ...p, ...applyVote(before, value) });
    try {
      const result = await api.vote(post!.id, value);
      setData((p) => p && { ...p, ...result });
    } catch {
      setData((p) => p && { ...p, ...before });
    }
  }

  async function send() {
    if (text.trim().length < 2) return setFormError('Your comment is empty.');
    setSaving(true);
    setFormError(null);
    try {
      const comment = await api.addComment(post!.id, { body: text, parentId: replyTo?.id ?? null });
      setData((p) => p && { ...p, comments: [...p.comments, comment], commentCount: p.commentCount + 1 });
      setText('');
      setReplyTo(null);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const removePost = () =>
    confirm('Delete this post?', 'The post and all its comments will be removed.', 'Delete', async () => {
      try {
        await api.deletePost(post.id);
        router.back();
      } catch (err) {
        setFormError(errorMessage(err));
      }
    });

  const removeComment = (commentId: string) =>
    confirm('Delete this comment?', 'Any replies to it will be removed too.', 'Delete', async () => {
      try {
        await api.deleteComment(commentId);
        reload();
      } catch (err) {
        setFormError(errorMessage(err));
      }
    });

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Card style={{ flexDirection: 'row', gap: space.md }}>
        <VoteButtons score={post.score} myVote={post.myVote} onVote={vote} />
        <View style={{ flex: 1, gap: space.sm }}>
          <Muted>
            <Text style={{ color: colors.brand700, fontWeight: '600' }}>{topicLabel(post.topic)}</Text> · {post.authorName} · {timeAgo(post.createdAt)}
          </Muted>
          <Text accessibilityRole="header" style={{ fontSize: 19, fontWeight: '700', color: colors.brand900 }}>
            {post.title}
          </Text>
          <Body>{post.body}</Body>
          {canModerate(post.authorId) ? <Button title="Delete post" variant="danger" small style={{ alignSelf: 'flex-start' }} onPress={removePost} /> : null}
        </View>
      </Card>

      <H2>{plural(post.comments.length, 'comment')}</H2>

      {user ? (
        <Card>
          {formError ? <Notice>{formError}</Notice> : null}
          {replyTo ? (
            <View style={styles.between}>
              <Muted>Replying to {replyTo.name}</Muted>
              <Pressable accessibilityRole="button" onPress={() => setReplyTo(null)} hitSlop={8}>
                <Text style={{ color: colors.brand700, fontSize: 13, fontWeight: '600' }}>Cancel reply</Text>
              </Pressable>
            </View>
          ) : null}
          <Input label={replyTo ? 'Your reply' : 'Add a comment'} value={text} onChangeText={setText} multiline maxLength={5000} style={{ minHeight: 70 }} />
          <Button title={replyTo ? 'Reply' : 'Comment'} small style={{ alignSelf: 'flex-start' }} onPress={send} loading={saving} />
        </Card>
      ) : (
        <Button title="Sign in to comment" variant="ghost" onPress={() => router.push('/login')} />
      )}

      {threadComments(post.comments).map((c) => (
        <View key={c.id} style={{ marginLeft: c.depth * 14, paddingLeft: c.depth ? space.md : 0, borderLeftWidth: c.depth ? 2 : 0, borderLeftColor: colors.brand100, gap: 2 }}>
          <Muted>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{c.authorName}</Text> · {timeAgo(c.createdAt)}
          </Muted>
          <Body>{c.body}</Body>
          <View style={[styles.row, { gap: space.lg }]}>
            {user ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Reply to ${c.authorName}`} hitSlop={8} onPress={() => setReplyTo({ id: c.id, name: c.authorName })}>
                <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>Reply</Text>
              </Pressable>
            ) : null}
            {canModerate(c.authorId) ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Delete comment" hitSlop={8} onPress={() => removeComment(c.id)}>
                <Text style={{ color: colors.danger, fontSize: 13 }}>Delete</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
    </Screen>
  );
}
