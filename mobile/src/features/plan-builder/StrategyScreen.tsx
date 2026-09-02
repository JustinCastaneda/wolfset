import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { RadioCard } from '@/components/RadioCard';
import { TopBar } from '@/components/TopBar';
import { createPlan, type ProgressionStrategy } from '@/lib/db/plan-store';
import { color, type } from '@/theme/tokens';
import { DEFAULT_STRATEGY, STRATEGIES } from './strategies';

// How You Get Stronger — the plan's default progression (Figma 101:994; selected rows
// 380:8548 steady / 380:9747 by feel). Next writes the plan: name + default, plus its
// first day, then opens Search Exercise for that day's first lift.

export function StrategyScreen() {
  const insets = useSafeAreaInsets();
  const { name } = useLocalSearchParams<{ name: string }>();
  const planName = name ?? 'New Plan';
  const [strategy, setStrategy] = useState<ProgressionStrategy>(DEFAULT_STRATEGY);

  const onNext = () => {
    const { dayId } = createPlan({ name: planName, progressionDefault: strategy }, Date.now());
    // The plan exists now, so the naming steps leave the stack: back from "What's the
    // first lift?" is home, not a second copy of this plan.
    router.dismissAll();
    router.push({ pathname: '/plan/day/[dayId]/search', params: { dayId } });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TopBar
        left={<ArrowLeft color={color.text.primary} size={24} />}
        onPressLeft={() => router.back()}
        title={`${planName} • Progression`}
      />
      <View style={styles.body}>
        <View style={styles.titleBlock}>
          <Text style={styles.h1}>How You Get Stronger</Text>
          <Text style={styles.subtitle}>Sets the default for every lift in this plan</Text>
        </View>
        <View accessibilityRole="radiogroup" style={styles.cards}>
          {STRATEGIES.map((s) => (
            <RadioCard
              description={s.description}
              key={s.id}
              onPress={() => setStrategy(s.id)}
              selected={strategy === s.id}
              title={s.title}
            />
          ))}
        </View>
      </View>
      <View style={styles.bottomBar}>
        <Button onPress={onNext} title="Next" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  // Figma 101:995: pt24, gap 24; title block px24 py4 gap 8; cards p24 gap 24.
  body: { flex: 1, paddingTop: 24, gap: 24 },
  titleBlock: { paddingHorizontal: 24, paddingVertical: 4, gap: 8 },
  h1: { ...type.h1, color: color.text.primary },
  // Figma: Geom Regular 20 — not one of the 14 type tokens (same as the grid's subtitle).
  subtitle: { fontFamily: 'Geom', fontSize: 20, fontWeight: '400', color: color.text.secondary },
  cards: { padding: 24, gap: 24 },
  bottomBar: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
});
