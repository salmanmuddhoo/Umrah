import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme';

// The native animation driver does not exist on web (used for development previews).
const NATIVE = Platform.OS !== 'web';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** True when the person has asked their phone to reduce motion; animations then become instant. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      ?.then((value) => live && setReduce(value))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}

/** Fades its children in while sliding them up a little. `delay` staggers items in a list. */
export function FadeInUp({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const [progress] = useState(() => new Animated.Value(0));
  const reduce = useReduceMotion();

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduce ? 0 : 420,
      delay: reduce ? 0 : delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay, reduce]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** How long to wait before the nth item of a list animates in; later items stop adding delay. */
export const stagger = (index: number, step = 60, max = 6) => Math.min(index, max) * step;

/** A pressable that gently shrinks while held, so taps feel physical. */
export function PressableScale({ children, style, ...props }: Omit<PressableProps, 'style' | 'children'> & { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [scale] = useState(() => new Animated.Value(1));
  const reduce = useReduceMotion();
  const to = (toValue: number) => {
    if (reduce) return;
    Animated.spring(scale, { toValue, useNativeDriver: NATIVE, speed: 40, bounciness: 6 }).start();
  };
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        to(0.96);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        props.onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}>
      {children}
    </AnimatedPressable>
  );
}

/** Runs a value back and forth between 0 and 1 for as long as the component is mounted. */
function useLoop(duration: number, enabled: boolean) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!enabled) return;
    const step = (toValue: number) => Animated.timing(value, { toValue, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE });
    const loop = Animated.loop(Animated.sequence([step(1), step(0)]));
    loop.start();
    return () => loop.stop();
  }, [value, duration, enabled]);
  return value;
}

/** A grey block that pulses while content loads. */
export function Skeleton({ height, width = '100%', style }: { height: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  const pulse = useLoop(800, !useReduceMotion());
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] });
  return <Animated.View style={[{ height, width, borderRadius: radius.md, backgroundColor: colors.slateBg, opacity }, style]} />;
}

/** Placeholder cards shown in place of a list while it loads. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View accessible accessibilityLabel="Loading" style={{ gap: space.md }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={s.skeletonCard}>
          <Skeleton height={18} width="62%" />
          <Skeleton height={12} width="90%" />
          <Skeleton height={12} width="45%" />
        </View>
      ))}
    </View>
  );
}

/** Soft circles that drift slowly behind a banner's content. Purely decorative. */
export function FloatingShapes({ color = '#ffffff1a' }: { color?: string }) {
  const reduce = useReduceMotion();
  const slow = useLoop(4200, !reduce);
  const slower = useLoop(6000, !reduce);
  const up = slow.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const down = slower.interpolate({ inputRange: [0, 1], outputRange: [0, 16] });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[s.shape, { width: 190, height: 190, right: -60, top: -70, backgroundColor: color, transform: [{ translateY: up }] }]} />
      <Animated.View style={[s.shape, { width: 110, height: 110, right: 70, bottom: -60, backgroundColor: color, transform: [{ translateY: down }] }]} />
      <Animated.View style={[s.shape, { width: 60, height: 60, left: -20, bottom: -24, backgroundColor: color, transform: [{ translateY: up }] }]} />
    </View>
  );
}

/** A bar that animates to `value` (0–1) whenever it changes. */
export function ProgressBar({ value, color = colors.brand700, label }: { value: number; color?: string; label?: string }) {
  const target = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const [progress] = useState(() => new Animated.Value(0));
  const reduce = useReduceMotion();
  useEffect(() => {
    // Width is a layout property, which the native driver cannot animate.
    const animation = Animated.timing(progress, { toValue: target, duration: reduce ? 0 : 500, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [progress, target, reduce]);
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }} style={s.track}>
      <Animated.View style={{ height: '100%', width, backgroundColor: color, borderRadius: radius.pill }} />
    </View>
  );
}

const s = StyleSheet.create({
  shape: { position: 'absolute', borderRadius: 999 },
  skeletonCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: '#0000000d' },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.slateBg, overflow: 'hidden' },
});
