import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { statusLabel } from '@/lib/format';
import { colors, radius, space } from '@/theme';

import { NATIVE, SkeletonList, useReduceMotion } from './motion';

/** A scrolling page with standard padding and optional pull-to-refresh. */
export function Screen({ children, refreshing, onRefresh }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand700} /> : undefined}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function H1({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={styles.h1}>{children}</Text>;
}
export function H2({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={styles.h2}>{children}</Text>;
}
export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}
export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'gold';
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A raised, "3D" button: the coloured face sits on a darker ledge and sinks
 * onto it while pressed, like a physical key.
 */
export function Button({ title, onPress, variant = 'primary', loading, disabled, small, style }: ButtonProps) {
  const off = disabled || loading;
  const filled = variant === 'primary' || variant === 'gold';
  const depth = small ? BUTTON_DEPTH_SMALL : BUTTON_DEPTH;
  const [press] = useState(() => new Animated.Value(0));
  const reduce = useReduceMotion();
  const to = (toValue: number) => Animated.timing(press, { toValue, duration: reduce ? 0 : 70, useNativeDriver: NATIVE }).start();
  // Stop a hair short of the ledge so an edge of it stays visible when fully pressed.
  const translateY = press.interpolate({ inputRange: [0, 1], outputRange: [0, depth - 1] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      onPressIn={() => to(1)}
      onPressOut={() => to(0)}
      style={[{ paddingBottom: depth }, off && styles.dim, style]}>
      <View style={[styles.buttonLedge, { top: depth, backgroundColor: buttonLedges[variant] }]} />
      <Animated.View style={[styles.button, small && styles.buttonSmall, buttonStyles[variant], { transform: [{ translateY }] }]}>
        {loading ? (
          <ActivityIndicator color={filled ? colors.white : colors.brand700} />
        ) : (
          <Text style={[styles.buttonText, small && styles.buttonTextSmall, buttonTextStyles[variant]]}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function Input({ label, hint, style, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#94a3b8"
        style={[styles.input, props.multiline && styles.inputMultiline, style]}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A row of selectable pills. With `label` it acts as a form field. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <View style={label ? styles.field : undefined}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(o.value)}
              style={[styles.chip, selected && styles.chipOn]}>
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={styles.toggle}>
      <View style={[styles.checkbox, value && styles.checkboxOn]}>{value ? <Text style={styles.checkmark}>✓</Text> : null}</View>
      <Text style={styles.body}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ children, tone = 'brand' }: { children: ReactNode; tone?: 'brand' | 'gold' | 'amber' | 'red' | 'slate' }) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

const STATUS_TONES: Record<string, keyof typeof tones> = {
  PENDING: 'amber',
  CONFIRMED: 'brand',
  APPROVED: 'brand',
  COMPLETED: 'slate',
  CANCELLED: 'red',
  SUSPENDED: 'red',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONES[status] ?? 'slate'}>{statusLabel(status)}</Badge>;
}

export function Notice({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'ok' | 'warn' }) {
  const t = tone === 'error' ? tones.red : tone === 'warn' ? tones.amber : tones.brand;
  return (
    <View accessible accessibilityRole={tone === 'error' ? 'alert' : undefined} style={[styles.notice, { backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <Card style={styles.empty}>
      <Text style={[styles.muted, { textAlign: 'center' }]}>{children}</Text>
    </Card>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </Card>
  );
}

/** Shows a spinner or an error with a retry button until a query has data. */
export function QueryState({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  if (error) {
    return (
      <View style={styles.center}>
        <Notice>{error}</Notice>
        <Button title="Try again" variant="ghost" onPress={onRetry} />
      </View>
    );
  }
  if (loading) {
    return (
      <View style={styles.loading}>
        <SkeletonList />
      </View>
    );
  }
  return null;
}

export function Stars({ n }: { n: number }) {
  return (
    <Text accessibilityLabel={`${n}-star hotel`} style={{ color: colors.gold400 }}>
      {'★'.repeat(n)}
      <Text style={{ color: '#cbd5e1' }}>{'★'.repeat(Math.max(0, 5 - n))}</Text>
    </Text>
  );
}

/** Asks before a destructive action. React Native's Alert has no buttons on web, so web uses the browser dialog. */
export function confirm(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Keep', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

const tones = {
  brand: { bg: colors.brand100, fg: colors.brand800 },
  gold: { bg: colors.gold100, fg: colors.gold600 },
  amber: { bg: colors.amberBg, fg: colors.amber },
  red: { bg: colors.dangerBg, fg: colors.danger },
  slate: { bg: colors.slateBg, fg: '#334155' },
} as const;

/** How far a button's face stands proud of its ledge, in points. */
export const BUTTON_DEPTH = 4;
export const BUTTON_DEPTH_SMALL = 3;

const buttonStyles = StyleSheet.create({
  // The lighter top edge reads as light catching the face.
  primary: { backgroundColor: colors.brand700, borderTopWidth: 1, borderTopColor: '#34a37f' },
  gold: { backgroundColor: colors.gold400, borderTopWidth: 1, borderTopColor: '#f3d57a' },
  ghost: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#cfe0d6' },
  danger: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#f5b5b5' },
});
/** The darker ledge each face sits on. */
const buttonLedges = { primary: colors.brand900, gold: '#b08d1e', ghost: '#b9cfc3', danger: '#e39a9a' } as const;
const buttonTextStyles = StyleSheet.create({
  primary: { color: colors.white },
  gold: { color: colors.text },
  ghost: { color: '#334155' },
  danger: { color: colors.danger },
});

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sand },
  screenContent: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: '#0000000d', gap: space.sm },
  h1: { fontSize: 24, fontWeight: '700', color: colors.brand900 },
  h2: { fontSize: 17, fontWeight: '700', color: colors.brand900, marginTop: space.sm },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  muted: { fontSize: 13, lineHeight: 18, color: colors.muted },
  button: { minHeight: 46, borderRadius: radius.md, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center' },
  buttonLedge: { position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: radius.md },
  buttonSmall: { minHeight: 36, paddingHorizontal: space.md },
  buttonText: { fontSize: 15, fontWeight: '600' },
  buttonTextSmall: { fontSize: 13 },
  dim: { opacity: 0.6 },
  field: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155' },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm, fontSize: 15, color: colors.text, backgroundColor: colors.white },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: colors.muted },
  chips: { gap: space.sm, paddingVertical: 2 },
  chip: { paddingHorizontal: space.md, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.brand700, borderColor: colors.brand700 },
  chipText: { fontSize: 13, color: '#475569' },
  chipTextOn: { color: colors.white, fontWeight: '600' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#94a3b8', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  checkboxOn: { backgroundColor: colors.brand700, borderColor: colors.brand700 },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontSize: 12, fontWeight: '600' },
  notice: { borderRadius: radius.md, padding: space.md },
  empty: { paddingVertical: space.xl * 1.5 },
  stat: { flexGrow: 1, flexBasis: '45%' },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.brand900 },
  loading: { flex: 1, padding: space.lg, backgroundColor: colors.sand },
  center: { flex: 1, padding: space.xl, gap: space.md, justifyContent: 'center', backgroundColor: colors.sand },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  between: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.sm },
  listContent: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  price: { fontSize: 20, fontWeight: '700', color: colors.brand800, textAlign: 'right' },
});
