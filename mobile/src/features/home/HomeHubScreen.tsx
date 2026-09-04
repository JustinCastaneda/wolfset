import { Link, router, useFocusEffect } from 'expo-router';
import { ArrowRight, BookOpen, Dumbbell, History, Play } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconCard } from '@/components/IconCard';
import { ListItem } from '@/components/ListItem';
import { WeekStrip } from '@/components/WeekStrip';
import { showOnWatch } from '@/features/hr/watch-control';
import {
  loadActivePlan,
  setNextDay,
  type ActivePlan,
  type ActivePlanDay,
} from '@/lib/db/plan-store';
import { loadSnapshot } from '@/lib/db/session-store';
import { suggestedWeek } from '@/lib/plan-week';
import { color, type } from '@/theme/tokens';

// The home hub — Change It Up (Figma 34:1464): the active plan's days, the one the
// rotation points at tagged Up Next, an arrow on each that runs it; the Suggested Week;
// then four tiles. The flowchart's edge is arrow → the workout, so an arrow both points
// the rotation at that day and starts it (the watch's Change It Up points without
// starting, for a wrist that only wants to pick). A workout already under way keeps its
// day: only its own arrow is live, and it resumes.
//
// Not built yet, so their tiles render disabled: Freestyle Workout, Browse Exercises
// (Search Exercise only exists inside a plan day) and Workout History. The frame's top
// bar (initials avatar, settings gear) waits on a profile and Settings.
//
// With no plan to show — none active, or one with no days — the hub is Get Started
// (101:637), the first-run entry into plan build.

export function HomeHubScreen() {
  const insets = useSafeAreaInsets();
  // Snapshot and plan reads are impure — done on focus, async, never in render.
  const [hasSession, setHasSession] = useState(false);
  const [plan, setPlan] = useState<ActivePlan | null>(null);
  useFocusEffect(
    useCallback(() => {
      const id = setTimeout(() => {
        const saved = loadSnapshot();
        const live = saved !== null && saved.state.phase.name !== 'done';
        setHasSession(live);
        setPlan(loadActivePlan());
        // No workout under way, so the watch has nothing to show. The session clears the
        // watch when it is left, but a phone killed mid-workout never got to; the last
        // set it published would otherwise sit on the wrist until the next Start Workout
        // (Justin, 2026-09-04: a stale exercise on the watch).
        if (!live) showOnWatch(JSON.stringify({ screen: 'none' }));
      }, 0);
      return () => clearTimeout(id);
    }, []),
  );

  const run = (day: ActivePlanDay) => {
    if (!hasSession) setNextDay(day.dayId);
    router.push('/session');
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      style={styles.root}
    >
      {plan === null ? (
        <GetStarted />
      ) : (
        <>
          <View style={styles.titleBlock}>
            <Text style={styles.h1}>Change It Up</Text>
          </View>
          <View>
            {/* The frame reads "Plan A • Week 3 of 5"; the week waits on the plan
                knowing its length (data-model `plannedWeeks`). */}
            <Text style={styles.planName}>{plan.planName}</Text>
            {plan.days.map((day) => {
              const canRun = day.exercises.length > 0 && (!hasSession || day.isNext);
              return (
                <ListItem
                  caption={
                    day.exercises.length > 0
                      ? day.exercises.map((e) => e.name).join(' • ')
                      : 'No exercises yet'
                  }
                  key={day.dayId}
                  title={day.name}
                  titleTag={day.isNext ? (hasSession ? 'In Progress' : 'Up Next') : undefined}
                  trailing={
                    <Button
                      accessibilityLabel={`${hasSession && day.isNext ? 'Resume' : 'Start'} ${day.name}`}
                      disabled={!canRun}
                      leftIcon={
                        <ArrowRight
                          color={canRun ? color.text.onButton : color.text.disabled}
                          size={24}
                        />
                      }
                      onPress={() => run(day)}
                      size="small"
                      variant={day.isNext ? 'solid' : 'secondary'}
                    />
                  }
                />
              );
            })}
            <View style={styles.week}>
              <WeekStrip week={suggestedWeek(plan.days.length)} />
            </View>
          </View>
          <View style={styles.tiles}>
            <View style={styles.tileRow}>
              <IconCard
                icon={<BookOpen color={color.text.primary} size={32} />}
                label={'Edit Current\nMesoCycle'}
                onPress={() =>
                  router.push({ pathname: '/plan/[planId]', params: { planId: plan.planId } })
                }
              />
              <IconCard
                disabled
                icon={<Play color={color.text.disabled} size={32} />}
                label={'Freestyle\nWorkout'}
              />
            </View>
            <View style={styles.tileRow}>
              <IconCard
                disabled
                icon={<Dumbbell color={color.text.disabled} size={32} />}
                label={'Browse\nExercises'}
              />
              <IconCard
                disabled
                icon={<History color={color.text.disabled} size={32} />}
                label={'Workout\nHistory'}
              />
            </View>
          </View>
        </>
      )}
      {__DEV__ && (
        <Link href="/design-kit" style={styles.kitLink}>
          Design Kit
        </Link>
      )}
    </ScrollView>
  );
}

// Get Started (101:637), reduced to its Build a Plan card until Freestyle exists.
function GetStarted() {
  return (
    <>
      <View style={styles.titleBlock}>
        <Text style={styles.h1}>{'Get\nStarted'}</Text>
        <Text style={styles.lede}>Build a Plan or dive right in, the choice is yours.</Text>
      </View>
      <View style={styles.startCard}>
        <Dumbbell color={color.text.primary} size={32} />
        <View style={styles.startText}>
          <Text style={styles.startTitle}>Progressive Overload</Text>
          <Text style={styles.startBody}>
            Select exercises, and build a custom mesocycle workout plan
          </Text>
        </View>
        <Button onPress={() => router.push('/plan/new')} size="small" title="Build a Plan" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  scroll: { gap: 32 },
  titleBlock: { paddingHorizontal: 24, paddingVertical: 4, gap: 8 },
  h1: { ...type.h1, color: color.text.primary },
  lede: { ...type.body, lineHeight: 20, color: color.text.secondary },
  planName: { ...type.body, color: color.text.secondary, paddingHorizontal: 24, paddingBottom: 4 },
  week: { paddingTop: 12 },
  tiles: { paddingHorizontal: 24, gap: 24 },
  tileRow: { flexDirection: 'row', gap: 24 },
  // Get Started's card (359:2100): raised r12, pad 16, icon · text · button 24 apart.
  startCard: {
    marginHorizontal: 24,
    padding: 16,
    gap: 24,
    borderRadius: 12,
    backgroundColor: color.bg.raised,
  },
  startText: { gap: 8 },
  startTitle: { ...type.title, color: color.text.primary },
  startBody: { ...type.body, lineHeight: 20, color: color.text.secondary },
  kitLink: { ...type.label, color: color.text.muted, textAlign: 'center', padding: 12 },
});
