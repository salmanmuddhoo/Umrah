import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { FadeInUp, PressableScale, ProgressBar, stagger } from '@/components/motion';
import { Body, Button, Card, Empty, H1, Muted, QueryState, Screen, styles } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { date, plural } from '@/lib/format';
import { countdown, progress } from '@/lib/planner';
import { useQuery } from '@/lib/useQuery';
import { colors, radius, space } from '@/theme';

function useNow() {
  // One reading per visit to the screen is plenty for a countdown in days.
  const { data } = useQuery('now', async () => Date.now());
  return data;
}

/** A person's Umrah plans. Plans are saved to their account, so this needs sign-in. */
export function PlannerList() {
  const { api, user } = useAuth();
  const now = useNow();
  const { data, error, loading, refreshing, reload } = useQuery(`plans:${user?.id}`, async () => (user ? api.plans() : []));

  if (!user) {
    return (
      <Screen>
        <H1>Plan your Umrah</H1>
        <Body>Keep your travel dates and a checklist for every stage of the trip in one place, from renewing your passport to buying Zamzam on the way home.</Body>
        <Button title="Sign in to start a plan" onPress={() => router.push('/login')} />
      </Screen>
    );
  }
  if (!data) return <QueryState loading={loading} error={error} onRetry={reload} />;

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Button title="New plan" onPress={() => router.push('/planner/new')} />
      {data.length === 0 ? <Empty>No plans yet. Start one and we will fill in a checklist to get you going.</Empty> : null}
      {data.map((plan, i) => (
        <FadeInUp key={plan.id} delay={stagger(i)}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Open plan ${plan.title}`}
            onPress={() => router.push({ pathname: '/planner/[id]', params: { id: plan.id } })}
            style={styles.card}>
            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.brand900 }}>{plan.title}</Text>
              {now ? (
                <View style={pill}>
                  <Text style={{ color: colors.brand800, fontSize: 12, fontWeight: '700' }}>{countdown(plan.departDate, plan.returnDate, now)}</Text>
                </View>
              ) : null}
            </View>
            <Muted>
              {plan.departDate ? `${date(plan.departDate)}${plan.returnDate ? ` – ${date(plan.returnDate)}` : ''}` : 'Dates not set'} · {plural(plan.travellers, 'traveller')}
            </Muted>
            <ProgressBar value={progress(plan.doneCount, plan.itemCount)} label={`${plan.title} checklist progress`} />
            <Muted>
              {plan.doneCount} of {plan.itemCount} done
            </Muted>
          </PressableScale>
        </FadeInUp>
      ))}
      <Card style={{ backgroundColor: colors.brand50 }}>
        <Muted>Your plans are private to your account and follow you to any phone you sign in on.</Muted>
      </Card>
    </Screen>
  );
}

const pill = { backgroundColor: colors.brand100, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 4 } as const;
