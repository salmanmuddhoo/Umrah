import { Linking, Text, View } from 'react-native';

import { FadeInUp } from '@/components/motion';
import { Body, Button, Card, H2, Muted, Notice, Screen, styles } from '@/components/ui';
import { VISA_GOOD_TO_KNOW, VISA_OFFICIAL_LINKS, VISA_REVIEWED, VISA_ROUTES, VISA_STEPS } from '@/lib/visa';
import { colors, space } from '@/theme';

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ gap: space.sm }}>
      {items.map((item) => (
        <View key={item} style={[styles.row, { alignItems: 'flex-start' }]}>
          <Text style={{ color: colors.brand600, fontSize: 15, lineHeight: 22 }}>•</Text>
          <Body style={{ flex: 1 }}>{item}</Body>
        </View>
      ))}
    </View>
  );
}

/** How to get a visa for Umrah. Bundled in the app, like the rites guide, so it reads offline. */
export function VisaGuide() {
  return (
    <Screen>
      <Body>You need a valid visa to enter Saudi Arabia for Umrah. There are several ways to get one; which is right depends on your nationality, where you live and how you travel.</Body>
      <Notice tone="warn">
        Visa rules change often. This guide was last reviewed in {VISA_REVIEWED}. Always confirm the current requirements with the official sources below
        or your provider before you book.
      </Notice>

      <H2>Ways to get a visa</H2>
      {VISA_ROUTES.map((route, i) => (
        <FadeInUp key={route.id} delay={i * 70}>
          <Card>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.brand900 }}>{route.title}</Text>
            <Muted>{route.who}</Muted>
            <Bullets items={route.points} />
          </Card>
        </FadeInUp>
      ))}

      <H2>How to apply, step by step</H2>
      {VISA_STEPS.map((step, i) => (
        <View key={step.title} style={{ gap: space.sm, marginTop: space.xs }}>
          <View style={[styles.row, { gap: space.md }]}>
            <View style={number}>
              <Text style={{ color: colors.white, fontWeight: '700' }}>{i + 1}</Text>
            </View>
            <Text accessibilityRole="header" style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.brand900 }}>
              {step.title}
            </Text>
          </View>
          <Bullets items={step.points} />
        </View>
      ))}

      <H2>Good to know</H2>
      <Bullets items={VISA_GOOD_TO_KNOW} />

      <H2>Official sources</H2>
      {VISA_OFFICIAL_LINKS.map((link) => (
        <Button key={link.url} title={link.label} variant="ghost" onPress={() => void Linking.openURL(link.url)} />
      ))}
      <Muted>These open in your browser. My Ummah is not affiliated with the Saudi authorities and does not issue visas.</Muted>
    </Screen>
  );
}

const number = { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brand700, alignItems: 'center', justifyContent: 'center' } as const;
