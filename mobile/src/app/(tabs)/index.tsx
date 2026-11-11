import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { AdCarousel } from '@/components/AdCarousel';
import { FadeInUp, PressableScale } from '@/components/motion';
import { PackageCard } from '@/components/PackageCard';
import { Button, H2, Screen, styles } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Ad } from '@/lib/types';
import type { UmrahSection } from '@/lib/umrah';
import { useQuery } from '@/lib/useQuery';
import { colors, radius, space } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Shortcut = { title: string; text: string; icon: IconName; go: (signedIn: boolean) => void };

const umrah = (section: UmrahSection) => () => router.navigate({ pathname: '/umrah', params: { section } });

export const SHORTCUTS: Shortcut[] = [
  { title: 'Umrah packages', text: 'Flights, hotels and visas', icon: 'airplane', go: umrah('packages') },
  { title: 'Transport', text: 'Airport and intercity rides', icon: 'car', go: umrah('transport') },
  { title: 'How to perform Umrah', text: 'Every rite, with duas', icon: 'book', go: umrah('guide') },
  { title: 'Visa guide', text: 'Which visa and how to apply', icon: 'document-text', go: umrah('visa') },
  { title: 'Community', text: 'Ask fellow pilgrims', icon: 'chatbubbles', go: () => router.navigate('/community') },
  { title: 'My bookings', text: 'Track your requests', icon: 'calendar', go: (signedIn) => router.push(signedIn ? '/bookings' : '/login') },
];

export default function HomeScreen() {
  const { api, user } = useAuth();
  // Ads are a bonus: if they fail to load the rest of Home still shows.
  const { data, refreshing, reload } = useQuery('home', async () => {
    const [ads, packages] = await Promise.all([api.ads().catch((): Ad[] => []), api.packages({ sort: 'date' }).catch(() => [])]);
    return { ads, packages: packages.slice(0, 3) };
  });

  function openAd(ad: Ad) {
    void api.adClick(ad.id).catch(() => {}); // counting the tap must never get in the way of opening it
    if (ad.packageId) router.push({ pathname: '/packages/[id]', params: { id: ad.packageId } });
    else if (ad.serviceId) router.push({ pathname: '/transport/[id]', params: { id: ad.serviceId } });
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <FadeInUp>
        <View style={hero}>
          <Text style={{ color: colors.gold400, fontSize: 20 }}>لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ</Text>
          <Text accessibilityRole="header" style={{ color: colors.white, fontSize: 22, fontWeight: '700' }}>
            {user ? `Assalamu alaikum, ${user.name.split(' ')[0]}` : 'Assalamu alaikum'}
          </Text>
          <Text style={{ color: colors.brand100, fontSize: 14, lineHeight: 20 }}>Everything for your Umrah, in one place.</Text>
        </View>
      </FadeInUp>

      {data && data.ads.length > 0 ? (
        <FadeInUp delay={80}>
          <AdCarousel ads={data.ads} onPress={openAd} />
        </FadeInUp>
      ) : null}

      <H2>Services</H2>
      <View style={grid}>
        {SHORTCUTS.map((item, i) => (
          <FadeInUp key={item.title} delay={140 + i * 60} style={{ flexBasis: '47%', flexGrow: 1 }}>
            <PressableScale accessibilityRole="button" accessibilityLabel={item.title} onPress={() => item.go(!!user)} style={tile}>
              <View style={iconWrap}>
                <Ionicons name={item.icon} size={22} color={colors.brand700} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.brand900 }}>{item.title}</Text>
              <Text style={styles.muted}>{item.text}</Text>
            </PressableScale>
          </FadeInUp>
        ))}
      </View>

      {data && data.packages.length > 0 ? (
        <>
          <View style={[styles.between, { alignItems: 'center' }]}>
            <H2>Departing soon</H2>
            <Button title="See all" variant="ghost" small onPress={umrah('packages')} />
          </View>
          {data.packages.map((pkg, i) => (
            <FadeInUp key={pkg.id} delay={i * 80}>
              <PackageCard pkg={pkg} onPress={() => router.push({ pathname: '/packages/[id]', params: { id: pkg.id } })} />
            </FadeInUp>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const hero = { backgroundColor: colors.brand700, borderRadius: radius.lg, padding: space.lg, gap: space.sm } as const;
const grid = { flexDirection: 'row', flexWrap: 'wrap', gap: space.md } as const;
const tile = { backgroundColor: colors.white, borderRadius: radius.lg, padding: space.lg, gap: 4, borderWidth: 1, borderColor: '#0000000d', minHeight: 124 } as const;
const iconWrap = { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center', marginBottom: 4 } as const;
