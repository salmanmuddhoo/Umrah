import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { FadeInUp } from '@/components/motion';
import { Chips } from '@/components/ui';
import { GuideContent } from '@/features/GuideContent';
import { PackagesList } from '@/features/PackagesList';
import { TransportList } from '@/features/TransportList';
import { VisaGuide } from '@/features/VisaGuide';
import { UMRAH_SECTIONS, parseSection } from '@/lib/umrah';
import { colors, space } from '@/theme';

/**
 * Everything about Umrah in one place. The open section lives in the route
 * (`/umrah?section=visa`) so Home shortcuts and ads can link straight to one.
 */
export default function UmrahScreen() {
  const section = parseSection(useLocalSearchParams<{ section?: string }>().section);

  return (
    <View style={{ flex: 1, backgroundColor: colors.sand }}>
      <View style={{ backgroundColor: colors.white, paddingHorizontal: space.lg, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Chips options={UMRAH_SECTIONS} value={section} onChange={(next) => router.setParams({ section: next })} />
      </View>
      {/* Keyed so each section animates in when it is chosen. */}
      <FadeInUp key={section} style={{ flex: 1 }}>
        {section === 'packages' ? <PackagesList /> : section === 'transport' ? <TransportList /> : section === 'guide' ? <GuideContent /> : <VisaGuide />}
      </FadeInUp>
    </View>
  );
}
