import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { GradientFill } from '@/components/Gradient';
import { FadeInUp, FloatingShapes } from '@/components/motion';
import { Body, Card, H2, Muted, Screen, styles } from '@/components/ui';
import { usePrices } from '@/lib/prices';
import { ZAMZAM_PLACES, ZAMZAM_RULES, ZAMZAM_TIPS } from '@/lib/zamzam';
import { colors, radius, space } from '@/theme';

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ gap: space.sm }}>
      {items.map((item) => (
        <View key={item} style={[styles.row, { alignItems: 'flex-start' }]}>
          <Text style={{ color: colors.brand600, fontSize: 15, lineHeight: 22 }}>•</Text>
          <Body style={{ flex: 1 }}>{item}</Body>
        </View>
      ))}
    </View>
  );
}

/** Where to buy Zamzam water at the airport to take home, and what it costs. */
export function ZamzamGuide() {
  const prices = usePrices();
  return (
    <Screen>
      <FadeInUp>
        <View style={priceCard}>
          <GradientFill name="brand" />
          <FloatingShapes />
          <View style={[styles.row, { gap: space.md }]}>
            <View style={drop}>
              <Ionicons name="water" size={26} color={colors.brand700} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.brand100, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>ZAMZAM AT THE AIRPORT</Text>
              <Text accessibilityLabel={`Price: ${prices.zamzam}`} style={{ color: colors.white, fontSize: 20, lineHeight: 26, fontWeight: '700' }}>
                {prices.zamzam}
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.brand100, fontSize: 13, lineHeight: 18 }}>
            Price last checked {prices.reviewed}. Prices are set by the Saudi authorities and can change; pay by card or cash in riyals.
          </Text>
        </View>
      </FadeInUp>

      <H2>Where to buy it</H2>
      {ZAMZAM_PLACES.map((place, i) => (
        <FadeInUp key={place.airport} delay={80 + i * 70}>
          <Card>
            <View style={[styles.row, { alignItems: 'flex-start', gap: space.md }]}>
              <Ionicons name="location" size={20} color={colors.brand700} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.brand900 }}>{place.airport}</Text>
                <Body>{place.where}</Body>
              </View>
            </View>
          </Card>
        </FadeInUp>
      ))}
      <Muted>Other Saudi airports, including Riyadh and Dammam, also have Zamzam sales points; ask at the information desk.</Muted>

      <H2>The rules</H2>
      <Bullets items={ZAMZAM_RULES} />

      <H2>Tips</H2>
      <Bullets items={ZAMZAM_TIPS} />
    </Screen>
  );
}

const priceCard = { backgroundColor: colors.brand700, borderRadius: radius.lg, padding: space.lg, gap: space.md, overflow: 'hidden' } as const;
const drop = { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' } as const;
