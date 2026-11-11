import { Pressable, Text, View } from 'react-native';

import { vehicleLabel } from '@/lib/constants';
import { money, plural } from '@/lib/format';
import type { Service } from '@/lib/types';
import { colors, space } from '@/theme';

import { Badge, Muted, styles } from './ui';

export function ServiceCard({ service, onPress }: { service: Service; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${service.title}, ${money(service.priceCents)} per trip`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.dim]}>
      <View style={[styles.row, { alignItems: 'flex-start', justifyContent: 'space-between' }]}>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: colors.brand900 }}>{service.title}</Text>
        <Badge tone="gold">{vehicleLabel(service.vehicleType)}</Badge>
      </View>
      <Text style={[styles.body, { fontWeight: '500' }]}>
        {service.fromPlace} → {service.toPlace}
      </Text>
      <Muted>Up to {plural(service.capacity, 'passenger')}</Muted>
      <View style={[styles.between, { marginTop: space.xs }]}>
        <Muted>by {service.provider.companyName}</Muted>
        <View>
          <Text style={styles.price}>{money(service.priceCents)}</Text>
          <Muted style={{ textAlign: 'right' }}>per trip</Muted>
        </View>
      </View>
    </Pressable>
  );
}
