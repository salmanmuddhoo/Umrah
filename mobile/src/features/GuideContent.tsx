import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Body, Button, Card, H2, Muted, Screen, styles } from '@/components/ui';
import { CHECKLIST, IHRAM_RESTRICTIONS, MIQATS, PREPARATION, STEPS } from '@/lib/guide';
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

/** The guide ships inside the app, so it works without a connection — including in the Haram. */
export function GuideContent() {
  return (
    <Screen>
      <Body>
        Umrah has four essential parts: entering ihram, tawaf around the Ka‘bah, sa‘i between Safa and Marwah, and shaving or trimming
        the hair. This guide walks through each in order.
      </Body>

      <H2>Before you travel</H2>
      <Bullets items={PREPARATION} />

      {STEPS.map((step, i) => (
        <View key={step.id} style={{ gap: space.md, marginTop: space.md }}>
          <View style={[styles.row, { alignItems: 'flex-start', gap: space.md }]}>
            <View style={number}>
              <Text style={{ color: colors.white, fontWeight: '700', fontSize: 16 }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={{ fontSize: 19, fontWeight: '700', color: colors.brand900 }}>
                {step.title}
              </Text>
              <Muted>{step.summary}</Muted>
            </View>
          </View>

          <Bullets items={step.points} />

          {step.duas?.map((dua) => (
            <Card key={dua.translit} style={{ borderLeftWidth: 4, borderLeftColor: colors.gold400 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.gold600, textTransform: 'uppercase' }}>{dua.when}</Text>
              <Text style={{ fontSize: 22, lineHeight: 40, color: colors.brand900, textAlign: 'right', writingDirection: 'rtl' }}>{dua.arabic}</Text>
              <Body style={{ fontStyle: 'italic' }}>{dua.translit}</Body>
              <Muted>{dua.meaning}</Muted>
            </Card>
          ))}

          {step.tip ? (
            <View style={{ backgroundColor: colors.brand50, borderRadius: 10, padding: space.md }}>
              <Body>
                <Text style={{ fontWeight: '700' }}>Tip: </Text>
                {step.tip}
              </Body>
            </View>
          ) : null}

          {step.id === 'ihram' ? (
            <>
              <Card>
                <Text style={{ fontWeight: '700', color: colors.brand900, fontSize: 15 }}>The miqats</Text>
                <Muted>The boundaries you must not cross without ihram.</Muted>
                {MIQATS.map((m) => (
                  <View key={m.name}>
                    <Text style={[styles.body, { fontWeight: '600' }]}>{m.name}</Text>
                    <Muted>{m.for}</Muted>
                  </View>
                ))}
              </Card>
              <Card>
                <Text style={{ fontWeight: '700', color: colors.brand900, fontSize: 15 }}>Not allowed while in ihram</Text>
                <Bullets items={IHRAM_RESTRICTIONS} />
              </Card>
            </>
          ) : null}
        </View>
      ))}

      <H2>Packing checklist</H2>
      <View style={{ gap: space.xs }}>
        {CHECKLIST.map((item) => (
          <Body key={item}>
            <Text style={{ color: colors.brand600 }}>✓ </Text>
            {item}
          </Body>
        ))}
      </View>

      <Card style={{ marginTop: space.md }}>
        <Muted>
          This guide is a general summary. The schools of Islamic law differ on some details, so please check anything you are unsure
          of with a scholar you trust.
        </Muted>
        <Button title="Ask the community" variant="ghost" onPress={() => router.push('/community')} />
      </Card>
    </Screen>
  );
}

const number = { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand700, alignItems: 'center', justifyContent: 'center' } as const;
