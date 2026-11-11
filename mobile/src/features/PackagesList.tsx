import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { PackageCard } from '@/components/PackageCard';
import { Chips, Empty, Input, QueryState, styles } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@/lib/useQuery';
import { colors, space } from '@/theme';

const SORTS = [
  { value: 'date', label: 'Soonest' },
  { value: 'price', label: 'Lowest price' },
  { value: 'price-desc', label: 'Highest price' },
  { value: 'duration', label: 'Shortest trip' },
] as const;

const STARS = [
  { value: '', label: 'Any hotel' },
  { value: '3', label: '3★+' },
  { value: '4', label: '4★+' },
  { value: '5', label: '5★' },
] as const;

export function PackagesList() {
  const { api } = useAuth();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('date');
  const [stars, setStars] = useState<(typeof STARS)[number]['value']>('');
  const { data, error, loading, refreshing, reload } = useQuery(`packages:${q}:${sort}:${stars}`, () => api.packages({ q, sort, stars }));

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      data={data ?? []}
      keyExtractor={(p) => p.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.brand700} />}
      ListHeaderComponent={
        <View style={{ gap: space.md }}>
          <Input
            label="Search packages"
            placeholder="City, hotel or provider"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => setQ(text.trim())}
            onBlur={() => setQ(text.trim())}
            returnKeyType="search"
            autoCorrect={false}
          />
          <Chips options={SORTS} value={sort} onChange={setSort} />
          <Chips options={STARS} value={stars} onChange={setStars} />
          {!data ? <QueryState loading={loading} error={error} onRetry={reload} /> : null}
        </View>
      }
      ListEmptyComponent={data ? <Empty>No packages match your search. Try widening your filters.</Empty> : undefined}
      renderItem={({ item }) => <PackageCard pkg={item} onPress={() => router.push({ pathname: '/packages/[id]', params: { id: item.id } })} />}
    />
  );
}
