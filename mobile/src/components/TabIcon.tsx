import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, type ColorValue } from 'react-native';

import { colors } from '@/theme';

import { GradientFill } from './Gradient';
import { NATIVE, useReduceMotion } from './motion';

/** How far the selected tab's icon rises above the others, in points. */
export const TAB_LIFT = 10;
/** How far the bubble extends beyond the icon on every side. */
const BUBBLE_PAD = 10;

/**
 * A tab bar icon that springs up into a raised, filled bubble when its tab is
 * selected and settles back when another tab is chosen.
 */
export function TabIcon({ name, focused, color, size }: { name: React.ComponentProps<typeof Ionicons>['name']; focused: boolean; color: ColorValue; size: number }) {
  const [lift] = useState(() => new Animated.Value(focused ? 1 : 0));
  const reduce = useReduceMotion();

  useEffect(() => {
    const toValue = focused ? 1 : 0;
    if (reduce) return lift.setValue(toValue);
    const animation = Animated.spring(lift, { toValue, useNativeDriver: NATIVE, speed: 16, bounciness: 14 });
    animation.start();
    return () => animation.stop();
  }, [lift, focused, reduce]);

  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -TAB_LIFT] });
  const scale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    // The wrapper keeps the icon's normal size so the label below is not pushed out of the bar; the bubble overflows it.
    <Animated.View style={[s.wrap, { width: size, height: size, transform: [{ translateY }, { scale }] }]}>
      <Animated.View style={[s.bubble, { opacity: lift }]}>
        <GradientFill name="brand" />
      </Animated.View>
      <Ionicons name={name} size={size} color={focused ? colors.white : (color as string)} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  // The white ring makes the bubble look like it stands proud of the bar.
  bubble: { position: 'absolute', top: -BUBBLE_PAD, right: -BUBBLE_PAD, bottom: -BUBBLE_PAD, left: -BUBBLE_PAD, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.brand700, borderWidth: 3, borderColor: colors.white },
});
