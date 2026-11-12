import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GradientFill } from '@/components/Gradient';
import { FadeInUp } from '@/components/motion';
import { Chips } from '@/components/ui';
import { GuideContent } from '@/features/GuideContent';
import { PackagesList } from '@/features/PackagesList';
import { TransportList } from '@/features/TransportList';
import { VisaGuide } from '@/features/VisaGuide';
import { ZamzamGuide } from '@/features/ZamzamGuide';
import { firstSection, groupOf, parseSection, UMRAH_GROUPS } from '@/lib/umrah';
import { colors, radius, space } from '@/theme';

const SECTION_VIEWS = {
  packages: <PackagesList />,
  transport: <TransportList />,
  guide: <GuideContent />,
  visa: <VisaGuide />,
  zamzam: <ZamzamGuide />,
} as const;

/**
 * Everything about Umrah, with what you book (Services) kept apart from what
 * you read (Guides). The open section lives in the route (`/umrah?section=visa`)
 * so Home shortcuts and ads can link straight to one.
 */
export default function UmrahScreen() {
  const section = parseSection(useLocalSearchParams<{ section?: string }>().section);
  const group = groupOf(section);
  const open = (next: string) => router.setParams({ section: next });

  return (
    <View style={{ flex: 1, backgroundColor: colors.sand }}>
      <View style={s.bar}>
        <View accessibilityRole="tablist" style={s.switch}>
          {UMRAH_GROUPS.map((g) => {
            const selected = g.value === group.value;
            return (
              <Pressable
                key={g.value}
                accessibilityRole="tab"
                accessibilityLabel={g.label}
                accessibilityState={{ selected }}
                onPress={() => open(firstSection(g.value))}
                style={[s.option, selected && s.optionOn]}>
                {selected ? <GradientFill name="brand" /> : null}
                <Text style={[s.optionText, selected && s.optionTextOn]}>{g.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Chips options={group.sections} value={section} onChange={open} />
      </View>
      {/* Keyed so each section animates in when it is chosen. */}
      <FadeInUp key={section} style={{ flex: 1 }}>
        {SECTION_VIEWS[section]}
      </FadeInUp>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { backgroundColor: colors.white, paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  switch: { flexDirection: 'row', backgroundColor: colors.sand, borderRadius: radius.md, padding: 4, gap: 4 },
  option: { flex: 1, minHeight: 40, overflow: 'hidden', borderRadius: radius.md - 2, alignItems: 'center', justifyContent: 'center' },
  optionOn: { backgroundColor: colors.brand700 },
  optionText: { fontSize: 15, fontWeight: '700', color: colors.muted },
  optionTextOn: { color: colors.white },
});
