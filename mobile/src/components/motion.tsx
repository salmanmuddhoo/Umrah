import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

// The native animation driver does not exist on web (used for development previews).
const NATIVE = Platform.OS !== 'web';

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

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** A pressable that gently shrinks while held, so taps feel physical. */
export function PressableScale({
  children,
  style,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const reduce = useReduceMotion();
  const to = (toValue: number) => {
    if (reduce) return;
    Animated.spring(scale, {
      toValue,
      useNativeDriver: NATIVE,
      speed: 40,
      bounciness: 6,
    }).start();
  };
  return (
    <Pressable
      {...props}
      onPressIn={(e) => {
        to(0.96);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        props.onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
