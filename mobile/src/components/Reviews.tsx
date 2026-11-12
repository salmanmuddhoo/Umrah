import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { plural, timeAgo } from '@/lib/format';
import type { ReviewKind } from '@/lib/types';
import { useQuery } from '@/lib/useQuery';
import { colors, space } from '@/theme';

import { FadeInUp, stagger } from './motion';
import { Badge, Body, Button, Card, confirm, H2, Input, Muted, Notice, styles } from './ui';

/** "★ 4.5 (12 reviews)", or "No reviews yet". Used on cards and detail pages. */
export function RatingSummary({ average, count, light }: { average: number | null; count: number; light?: boolean }) {
  const text = light ? { color: colors.brand100 } : undefined;
  if (!count || average === null) return <Muted style={text}>No reviews yet</Muted>;
  return (
    <Text accessibilityLabel={`Rated ${average} out of 5 from ${plural(count, 'review')}`} style={[styles.muted, text]}>
      <Text style={{ color: colors.gold400, fontWeight: '700' }}>★ {average.toFixed(1)}</Text> ({plural(count, 'review')})
    </Text>
  );
}

/** Five tappable stars. */
export function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Your rating" style={[styles.row, { gap: space.xs }]}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          accessibilityRole="radio"
          accessibilityLabel={plural(n, 'star')}
          accessibilityState={{ checked: value === n }}
          hitSlop={6}
          onPress={() => onChange(n)}>
          <Text style={{ fontSize: 32, color: n <= value ? colors.gold400 : '#c5d3cb' }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

const Stars = ({ n }: { n: number }) => (
  <Text accessibilityLabel={`${plural(n, 'star')} out of 5`} style={{ color: colors.gold400, fontSize: 15 }}>
    {'★'.repeat(n)}
    <Text style={{ color: '#c5d3cb' }}>{'★'.repeat(5 - n)}</Text>
  </Text>
);

/**
 * Everything about reviews on a listing's page: the summary, a form to add or
 * change your own review, and what others have written.
 */
export function Reviews({
  kind,
  listingId,
  canReview = true,
  onChange,
}: {
  kind: ReviewKind;
  listingId: string;
  canReview?: boolean;
  /** Called after a review is added, changed or removed, so the page can refresh its rating. */
  onChange?: () => void;
}) {
  const { api, user } = useAuth();
  const { data, error, reload } = useQuery(`reviews:${kind}:${listingId}:${user?.id}`, () => api.reviews(kind, listingId));
  const mine = data?.reviews.find((r) => r.mine);

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setRating(mine?.rating ?? 0);
    setComment(mine?.comment ?? '');
    setFormError(null);
    setEditing(true);
  }

  async function submit() {
    if (rating < 1) return setFormError('Tap the stars to choose a rating.');
    setSaving(true);
    try {
      await api.saveReview(kind, listingId, { rating, comment });
      setEditing(false);
      reload();
      onChange?.();
    } catch (err) {
      setFormError(errorMessage(err));
    }
    setSaving(false);
  }

  const remove = (reviewId: string) =>
    confirm('Delete your review?', 'Your rating and comment will be removed.', 'Delete', async () => {
      try {
        await api.deleteReview(reviewId);
        reload();
        onChange?.();
      } catch (err) {
        setFormError(errorMessage(err));
      }
    });

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.between}>
        <H2>Reviews</H2>
        {data ? <RatingSummary average={data.ratingAverage} count={data.ratingCount} /> : null}
      </View>

      {error ? <Notice>{error}</Notice> : null}

      {!canReview ? null : !user ? (
        <Button title="Sign in to write a review" variant="ghost" onPress={() => router.push('/login')} />
      ) : editing ? (
        <Card>
          <Text style={{ fontWeight: '700', color: colors.brand900, fontSize: 15 }}>{mine ? 'Edit your review' : 'Write a review'}</Text>
          {formError ? <Notice>{formError}</Notice> : null}
          <StarPicker value={rating} onChange={setRating} />
          <Input label="Your review (optional)" placeholder="What went well? What could be better?" value={comment} onChangeText={setComment} multiline maxLength={2000} />
          <View style={styles.row}>
            <Button title={mine ? 'Save changes' : 'Post review'} small onPress={() => void submit()} loading={saving} />
            <Button title="Cancel" variant="ghost" small onPress={() => setEditing(false)} disabled={saving} />
          </View>
        </Card>
      ) : data ? (
        <Button title={mine ? 'Edit your review' : 'Write a review'} variant="ghost" onPress={startEditing} />
      ) : null}

      {data && data.reviews.length === 0 ? <Muted>Be the first to share how it went.</Muted> : null}

      {data?.reviews.map((r, i) => (
        <FadeInUp key={r.id} delay={stagger(i)}>
          <Card>
            <View style={styles.between}>
              <Stars n={r.rating} />
              {r.verified ? <Badge>✓ Verified booking</Badge> : null}
            </View>
            {r.comment ? <Body>{r.comment}</Body> : null}
            <View style={styles.between}>
              <Muted>
                {r.mine ? 'You' : r.authorName} · {timeAgo(r.createdAt)}
              </Muted>
              {r.mine ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Delete your review" hitSlop={8} onPress={() => remove(r.id)}>
                  <Text style={{ color: colors.danger, fontSize: 13 }}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>
        </FadeInUp>
      ))}
    </View>
  );
}
