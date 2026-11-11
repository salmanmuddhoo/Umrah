import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, space } from '@/theme';

import { Notice } from './ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;
export const PIN_LENGTH = 4;

/**
 * A 4-digit PIN keypad. Calls `onComplete` with the PIN as soon as the fourth
 * digit is entered, then clears itself ready for another try.
 */
export function PinPad({
  title,
  subtitle,
  error,
  busy,
  onComplete,
}: {
  title: string;
  subtitle?: string;
  error?: string | null;
  busy?: boolean;
  onComplete: (pin: string) => void;
}) {
  const [pin, setPin] = useState('');

  function press(key: string) {
    if (busy) return;
    if (key === 'del') return setPin((p) => p.slice(0, -1));
    const next = pin + key;
    if (next.length < PIN_LENGTH) return setPin(next);
    setPin('');
    onComplete(next);
  }

  return (
    <View style={s.wrap}>
      <Text accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}

      {/* The digits are never shown or read out; only how many have been entered. */}
      <View accessible accessibilityLabel={`${pin.length} of ${PIN_LENGTH} digits entered`} style={s.dots}>
        {busy ? (
          <ActivityIndicator color={colors.brand700} />
        ) : (
          Array.from({ length: PIN_LENGTH }, (_, i) => <View key={i} style={[s.dot, i < pin.length && s.dotOn]} />)
        )}
      </View>

      {error ? <Notice>{error}</Notice> : null}

      <View style={s.keys}>
        {KEYS.map((key, i) =>
          key === '' ? (
            <View key={i} style={s.key} />
          ) : (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={key === 'del' ? 'Delete' : key}
              accessibilityState={{ disabled: !!busy }}
              disabled={busy}
              onPress={() => press(key)}
              style={({ pressed }) => [s.key, key !== 'del' && s.digit, pressed && s.pressed]}>
              <Text style={key === 'del' ? s.del : s.digitText}>{key === 'del' ? '⌫' : key}</Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  title: { fontSize: 22, fontWeight: '700', color: colors.brand900, textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: space.lg, height: 32, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.brand700 },
  dotOn: { backgroundColor: colors.brand700 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', width: 264, rowGap: space.md, columnGap: space.xl, marginTop: space.sm },
  key: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  digit: { borderRadius: 36, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  pressed: { backgroundColor: colors.brand100 },
  digitText: { fontSize: 26, fontWeight: '500', color: colors.text },
  del: { fontSize: 24, color: colors.muted },
});
