import { Text, View } from 'react-native';

import { inclusions } from '@/lib/constants';
import { date, money, plural } from '@/lib/format';
import type { Package } from '@/lib/types';
import { colors, radius, space } from '@/theme';

import { PressableScale } from './motion';
import { Badge, Muted, Stars, styles } from './ui';

export function PackageCard({ pkg, onPress }: { pkg: Package; onPress: () => void }) {
  const low = pkg.seatsLeft > 0 && pkg.seatsLeft <= 5;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${pkg.title}, ${money(pkg.priceCents)} per person`} onPress={onPress} style={card}>
      <View style={head}>
        <Text style={{ color: colors.brand200, fontSize: 12 }}>
          {pkg.durationDays} days · from {pkg.departureCity}
        </Text>
        <Text style={{ color: colors.white, fontSize: 17, fontWeight: '600' }}>{pkg.title}</Text>
      </View>
      <View style={{ padding: space.lg, gap: space.sm }}>
        <Text style={styles.body}>
          <Stars n={pkg.hotelStars} /> {pkg.makkahHotel}
          {pkg.madinahNights > 0 ? ` + ${pkg.madinahHotel}` : ''}
        </Text>
        <Muted>
          Departs {date(pkg.departureDate)} · {plural(pkg.makkahNights, 'night')} Makkah
          {pkg.madinahNights > 0 ? `, ${pkg.madinahNights} Madinah` : ''}
        </Muted>
        <View style={styles.wrap}>
          {inclusions(pkg).map((label) => (
            <Badge key={label}>{label}</Badge>
          ))}
        </View>
        <View style={styles.between}>
          <View>
            <Muted>by {pkg.provider.companyName}</Muted>
            <Muted style={low ? { color: colors.amber, fontWeight: '600' } : undefined}>
              {pkg.seatsLeft > 0 ? `${plural(pkg.seatsLeft, 'seat')} left` : 'Fully booked'}
            </Muted>
          </View>
          <View>
            <Text style={styles.price}>{money(pkg.priceCents)}</Text>
            <Muted style={{ textAlign: 'right' }}>per person</Muted>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const card = { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: '#0000000d' } as const;
const head = { backgroundColor: colors.brand700, paddingHorizontal: space.lg, paddingVertical: space.md, gap: 2 } as const;
