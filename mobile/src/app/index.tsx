import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { loadActivePlan, setNextDay, type ActivePlan } from '@/lib/db/plan-store';
import { loadSnapshot } from '@/lib/db/session-store';
import { color, type } from '@/theme/tokens';

// Placeholder shell so the app boots and CI has something to typecheck.
// The first real screen is the Set Loop (Phase 4) — build it as a state machine,
// not as screens. See docs/build-plan.md.

export default function Index() {
  // Snapshot and plan reads are impure — done on focus, async, never in render.
  const [hasSession, setHasSession] = useState(false);
  const [plan, setPlan] = useState<ActivePlan | null>(null);
  const refresh = useCallback(() => {
    const saved = loadSnapshot();
    setHasSession(saved !== null && saved.state.phase.name !== 'done');
    setPlan(loadActivePlan());
  }, []);
  useFocusEffect(
    useCallback(() => {
      const id = setTimeout(refresh, 0);
      return () => clearTimeout(id);
    }, [refresh]),
  );
  const next = plan?.days.find((d) => d.isNext);
  // Change It Up (the hub's "Workout A / B", flowchart Phase 4): which day Start Workout
  // runs. Only days with lifts, only while no workout is under way — a resumed session
  // keeps the day it started on.
  const choices = hasSession ? [] : (plan?.days.filter((d) => d.exercises.length > 0) ?? []);
  return (
    <View style={styles.root}>
      <Text style={styles.wordmark}>
        <Text style={styles.wolf}>WOLF</Text>
        <Text style={styles.set}>SET</Text>
      </Text>
      <View style={styles.startBar}>
        <Button
          onPress={() => router.push('/session')}
          title={hasSession ? 'Resume Workout' : 'Start Workout'}
        />
        {/* What the button runs — the placeholder for the hub's "Plan A • Week 3 of 5". */}
        {plan !== null && next !== undefined && (
          <Text style={styles.upNext}>{`${plan.planName} • ${next.name}`}</Text>
        )}
        {choices.length > 1 && (
          <View style={styles.days}>
            {choices.map((d) => (
              <Chip
                key={d.dayId}
                label={d.name}
                onPress={() => {
                  setNextDay(d.dayId);
                  refresh();
                }}
                selected={d.isNext}
                size="large"
                variant="brand"
              />
            ))}
          </View>
        )}
        {/* Placeholder entry until the Get Started hub (Figma 101:637) is built. */}
        <Button onPress={() => router.push('/plan/new')} title="Build a Plan" variant="secondary" />
      </View>
      {__DEV__ && (
        <Link href="/design-kit" style={styles.kitLink}>
          Design Kit
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg.base },
  // Wordmark is Geom Black (the h1 token), WOLF red / SET white — the naming rule in CLAUDE.md.
  wordmark: { ...type.h1, letterSpacing: 2 },
  startBar: { alignSelf: 'stretch', paddingHorizontal: 24, marginTop: 48, gap: 12 },
  days: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  kitLink: { ...type.label, color: color.text.muted, marginTop: 24, padding: 12 },
  upNext: { ...type.caption, color: color.text.secondary, textAlign: 'center' },
  wolf: { color: color.brand },
  set: { color: color.text.primary },
});
