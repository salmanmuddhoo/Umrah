import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FadeInUp, FloatingShapes, ProgressBar, stagger } from '@/components/motion';
import { Body, Button, Card, Chips, confirm, H2, Input, Muted, Notice, QueryState, Screen, styles } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { date, plural } from '@/lib/format';
import { countdown, groupByStage, PLAN_STAGES, progress } from '@/lib/planner';
import type { PlanItem } from '@/lib/types';
import { useQuery } from '@/lib/useQuery';
import { colors, radius, space } from '@/theme';

export default function PlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user } = useAuth();
  const { data: plan, setData, error, loading, refreshing, reload } = useQuery(`plan:${id}`, () => api.plan(id));
  const { data: now } = useQuery('now', async () => Date.now());

  const [text, setText] = useState('');
  const [stage, setStage] = useState<string>(PLAN_STAGES[0].value);
  const [actionError, setActionError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  if (!user) return <Redirect href="/login" />;
  if (!plan) return <QueryState loading={loading} error={error} onRetry={reload} />;

  const done = plan.items.filter((i) => i.done).length;
  const patchItems = (change: (items: PlanItem[]) => PlanItem[]) => setData((p) => p && { ...p, items: change(p.items) });

  async function toggle(item: PlanItem) {
    // Tick straight away; put it back if the server refuses.
    patchItems((items) => items.map((i) => (i.id === item.id ? { ...i, done: !item.done } : i)));
    try {
      await api.updatePlanItem(item.id, { done: !item.done });
      setActionError(null);
    } catch (err) {
      patchItems((items) => items.map((i) => (i.id === item.id ? { ...i, done: item.done } : i)));
      setActionError(errorMessage(err));
    }
  }

  async function add() {
    if (text.trim().length < 2) return setActionError('Write what needs doing.');
    setAdding(true);
    try {
      const item = await api.addPlanItem(plan!.id, { text, stage });
      patchItems((items) => [...items, item]);
      setText('');
      setActionError(null);
    } catch (err) {
      setActionError(errorMessage(err));
    }
    setAdding(false);
  }

  const removeItem = (item: PlanItem) =>
    confirm('Remove this item?', item.text, 'Remove', async () => {
      try {
        await api.deletePlanItem(item.id);
        patchItems((items) => items.filter((i) => i.id !== item.id));
      } catch (err) {
        setActionError(errorMessage(err));
      }
    });

  const removePlan = () =>
    confirm('Delete this plan?', 'The plan and its checklist will be removed for good.', 'Delete', async () => {
      try {
        await api.deletePlan(plan.id);
        router.back();
      } catch (err) {
        setActionError(errorMessage(err));
      }
    });

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <View style={hero}>
        <FloatingShapes />
        <Text accessibilityRole="header" style={{ color: colors.white, fontSize: 22, fontWeight: '700' }}>
          {plan.title}
        </Text>
        <Text style={{ color: colors.brand100, fontSize: 14 }}>
          {plan.departDate ? `${date(plan.departDate)}${plan.returnDate ? ` – ${date(plan.returnDate)}` : ''}` : 'Dates not set'} · {plural(plan.travellers, 'traveller')}
        </Text>
        {now ? <Text style={{ color: colors.gold400, fontSize: 16, fontWeight: '700' }}>{countdown(plan.departDate, plan.returnDate, now)}</Text> : null}
        <ProgressBar value={progress(done, plan.items.length)} color={colors.gold400} label="Checklist progress" />
        <Text style={{ color: colors.brand100, fontSize: 13 }}>
          {done} of {plan.items.length} done
        </Text>
      </View>

      {plan.notes ? (
        <Card>
          <Muted>Notes</Muted>
          <Body>{plan.notes}</Body>
        </Card>
      ) : null}
      {actionError ? <Notice>{actionError}</Notice> : null}

      {groupByStage(plan.items).map((group, g) => (
        <FadeInUp key={group.value} delay={stagger(g, 80)}>
          <H2>{group.label}</H2>
          <Card style={{ gap: 0, paddingVertical: space.xs }}>
            {group.items.map((item) => (
              <View key={item.id} style={row}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.done }}
                  accessibilityLabel={item.text}
                  onPress={() => void toggle(item)}
                  style={[styles.row, { flex: 1, gap: space.md, alignItems: 'flex-start' }]}>
                  <View style={[styles.checkbox, item.done && styles.checkboxOn, { marginTop: 1 }]}>{item.done ? <Text style={styles.checkmark}>✓</Text> : null}</View>
                  <Text style={[styles.body, { flex: 1 }, item.done && { color: colors.muted, textDecorationLine: 'line-through' }]}>{item.text}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.text}`} hitSlop={10} onPress={() => removeItem(item)}>
                  <Text style={{ color: colors.muted, fontSize: 18 }}>×</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        </FadeInUp>
      ))}

      <H2>Add your own</H2>
      <Card>
        <Input label="What needs doing?" placeholder="Buy gifts for the family" value={text} onChangeText={setText} maxLength={200} onSubmitEditing={() => void add()} />
        <Chips label="Part of the trip" options={PLAN_STAGES} value={stage} onChange={setStage} />
        <Button title="Add to checklist" small style={{ alignSelf: 'flex-start' }} onPress={() => void add()} loading={adding} />
      </Card>

      <Button title="Edit trip details" variant="ghost" onPress={() => router.push({ pathname: '/planner/new', params: { id: plan.id } })} />
      <Button title="Delete plan" variant="danger" onPress={removePlan} />
    </Screen>
  );
}

const hero = { backgroundColor: colors.brand700, borderRadius: radius.lg, padding: space.lg, gap: space.sm, overflow: 'hidden' } as const;
const row = { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.sand } as const;
