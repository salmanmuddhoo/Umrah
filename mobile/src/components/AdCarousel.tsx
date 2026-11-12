import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import type { Ad } from '@/lib/types';
import { colors, radius, space } from '@/theme';

import { FloatingShapes, PressableScale, useReduceMotion } from './motion';

const THEMES: Record<string, { bg: string; fg: string; soft: string; button: string; buttonText: string; shape: string; pattern: string }> = {
  brand: { bg: colors.brand700, fg: colors.white, soft: colors.brand100, button: colors.gold400, buttonText: colors.brand900, shape: '#ffffff14', pattern: colors.patternGold },
  gold: { bg: colors.gold100, fg: colors.brand900, soft: colors.gold600, button: colors.brand700, buttonText: colors.white, shape: '#e6bf4a40', pattern: colors.patternEmerald },
  night: { bg: colors.brand900, fg: colors.white, soft: colors.brand200, button: colors.gold400, buttonText: colors.brand900, shape: '#ffffff12', pattern: colors.patternGold },
};

/**
 * The advertising banner: sponsored cards that rotate on their own and can be
 * swiped. Each card is labelled "Sponsored" with the advertiser's name.
 */
export function AdCarousel({ ads, onPress, intervalMs = 5000 }: { ads: Ad[]; onPress: (ad: Ad) => void; intervalMs?: number }) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const reduce = useReduceMotion();
  const count = ads.length;
  const current = Math.min(index, Math.max(0, count - 1));

  // Advance on a timer. Restarting it whenever the card changes means a manual swipe gets a full interval too.
  useEffect(() => {
    if (count < 2) return;
    const timer = setTimeout(() => {
      const next = (current + 1) % count;
      scroller.current?.scrollTo?.({ x: next * width, animated: !reduce });
      setIndex(next);
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [current, count, width, intervalMs, reduce]);

  if (count === 0) return null;

  const onSwiped = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ gap: space.sm }}>
      <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onSwiped} style={s.scroller}>
        {ads.map((ad) => {
          const t = THEMES[ad.theme] ?? THEMES.brand;
          const linked = !!(ad.packageId || ad.serviceId);
          return (
            <PressableScale
              key={ad.id}
              accessibilityRole="button"
              accessibilityLabel={`Sponsored by ${ad.advertiser}: ${ad.headline}`}
              disabled={!linked}
              onPress={() => onPress(ad)}
              style={[s.card, { width: width || undefined, backgroundColor: t.bg }]}>
              <FloatingShapes color={t.shape} pattern={t.pattern} />
              <Text style={[s.sponsor, { color: t.soft }]}>SPONSORED · {ad.advertiser.toUpperCase()}</Text>
              <Text style={[s.headline, { color: t.fg }]} numberOfLines={2}>
                {ad.headline}
              </Text>
              {ad.body ? (
                <Text style={[s.body, { color: t.soft }]} numberOfLines={2}>
                  {ad.body}
                </Text>
              ) : null}
              {linked ? (
                <View style={[s.button, { backgroundColor: t.button }]}>
                  <Text style={{ color: t.buttonText, fontWeight: '700', fontSize: 13 }}>{ad.cta}</Text>
                </View>
              ) : null}
            </PressableScale>
          );
        })}
      </ScrollView>

      {count > 1 ? (
        <View accessible accessibilityLabel={`Ad ${current + 1} of ${count}`} style={s.dots}>
          {ads.map((ad, i) => (
            <View key={ad.id} style={[s.dot, i === current && s.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  scroller: { borderRadius: radius.lg },
  card: { minHeight: 168, borderRadius: radius.lg, padding: space.lg, gap: space.sm, overflow: 'hidden', justifyContent: 'center' },
  sponsor: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  headline: { fontSize: 21, lineHeight: 26, fontWeight: '700', maxWidth: '88%' },
  body: { fontSize: 14, lineHeight: 20, maxWidth: '88%' },
  button: { alignSelf: 'flex-start', marginTop: space.xs, paddingHorizontal: space.md, paddingVertical: 8, borderRadius: radius.pill },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, height: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#cbd5e1' },
  dotOn: { width: 20, backgroundColor: colors.brand700 },
});
