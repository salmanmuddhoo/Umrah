import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { ServiceCard } from '@/components/ServiceCard';
import { FadeInUp, stagger } from '@/components/motion';
import { Chips, Empty, Input, Muted, QueryState, styles } from '@/components/ui';
import { Page } from '@/components/Gradient';
import { useAuth } from '@/lib/auth';
import { VEHICLE_TYPES } from '@/lib/constants';
import { useQuery } from '@/lib/useQuery';
import { colors, space } from '@/theme';

const TYPES = [{ value: '', label: 'Any vehicle' }, ...VEHICLE_TYPES] as const;

export function TransportList() {
  const { api } = useAuth();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]['value']>('');
  const { data, error, loading, refreshing, reload } = useQuery(`services:${q}:${type}`, () => api.services({ q, type }));

  return (
    <Page>
      <FlatList
        style={styles.screen}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        data={data ?? []}
        keyExtractor={(s) => s.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.brand700} />}
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            <Muted>Airport transfers, intercity rides and ziyarah tours with licensed drivers.</Muted>
            <Input
              label="Search transport"
              placeholder="Route or place, e.g. Jeddah Airport"
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => setQ(text.trim())}
              onBlur={() => setQ(text.trim())}
              returnKeyType="search"
              autoCorrect={false}
            />
            <Chips options={TYPES} value={type} onChange={setType} />
            {!data ? <QueryState loading={loading} error={error} onRetry={reload} /> : null}
          </View>
        }
        ListEmptyComponent={data ? <Empty>No transport matches your search.</Empty> : undefined}
        renderItem={({ item, index }) => (
          <FadeInUp delay={stagger(index)}>
            <ServiceCard service={item} onPress={() => router.push({ pathname: '/transport/[id]', params: { id: item.id } })} />
          </FadeInUp>
        )}
      />
    </Page>
  );
}
