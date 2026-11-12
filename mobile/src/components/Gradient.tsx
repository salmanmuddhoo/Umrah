import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { gradients, type GradientName } from '@/theme';

/** Diagonal by default, top-left to bottom-right; `vertical` runs top to bottom. */
const DIRECTIONS = {
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  vertical: { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
} as const;

/** A gradient that fills its parent, drawn behind the parent's other children. */
export function GradientFill({ name = 'brand', direction = 'diagonal' }: { name?: GradientName; direction?: keyof typeof DIRECTIONS }) {
  return <LinearGradient pointerEvents="none" colors={gradients[name]} {...DIRECTIONS[direction]} style={StyleSheet.absoluteFill} />;
}

/** A full-screen page with the light green-to-gold background behind its content. */
export function Page({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flex: 1 }, style]}>
      <GradientFill name="page" direction="vertical" />
      {children}
    </View>
  );
}
