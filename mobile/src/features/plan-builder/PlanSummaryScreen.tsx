import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ReorderableRows } from '@/components/ReorderableRows';
import { TopBar } from '@/components/TopBar';
import {
  activatePlan,
  addPlanDay,
  loadPlan,
  removePlanDay,
  reorderPlanDays,
  type BuilderPlan,
  type PlanDaySummary,
} from '@/lib/db/plan-store';
import { color, type } from '@/theme/tokens';
import { STRATEGY_LABEL } from './exercise-defaults';
import { moveItem } from './reorder';
import { WEEKDAYS, dayLetter, planSubtitle, suggestedWeek } from './week';

// Plan Summary (Figma 123:2530): the plan's days by letter, Add Day, the Suggested
// Week, and Save Plan — which makes the plan the one Start Workout runs. Day rows use
// the same edit mechanics as Day Summary (tap to open, ✕ to remove, grip to reorder;
// Justin, 2026-09-02). The week is a suggestion only — nothing is scheduled yet.

const ROW_HEIGHT = 80;

export function PlanSummaryScreen() {
  const insets = useSafeAreaInsets();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const [plan, setPlan] = useState<BuilderPlan | null>(null);
  const [dragging, setDragging] = useState(false);
  useFocusEffect(
    useCallback(() => {
      const id = setTimeout(() => setPlan(planId ? loadPlan(planId) : null), 0);
      return () => clearTimeout(id);
    }, [planId]),
  );

  if (!plan) return <View style={[styles.root, { paddingTop: insets.top }]} />;
  const id = plan.id;
  const exerciseCount = plan.days.reduce((n, d) => n + d.exerciseNames.length, 0);
  const week = suggestedWeek(plan.days.length);

  const openDay = (day: PlanDaySummary) =>
    router.push({ pathname: '/plan/day/[dayId]', params: { dayId: day.id } });
  const addDay = () => {
    const dayId = addPlanDay(id);
    router.push({ pathname: '/plan/day/[dayId]/search', params: { dayId } });
  };
  const remove = (day: PlanDaySummary) => {
    removePlanDay(day.id);
    setPlan(loadPlan(id));
  };
  const move = (from: number, to: number) => {
    const next = moveItem(plan.days, from, to);
    reorderPlanDays(
      id,
      next.map((d) => d.id),
    );
    setPlan(loadPlan(id));
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TopBar
        left={<ArrowLeft color={color.text.primary} size={24} />}
        onPressLeft={() => router.back()}
        title={plan.name}
      />
      <ScrollView contentContainerStyle={styles.scroll} scrollEnabled={!dragging}>
        <View style={styles.titleBlock}>
          <Text style={styles.h1}>{plan.name}</Text>
          <Text style={styles.subtitle}>
            {planSubtitle(STRATEGY_LABEL[plan.strategy], plan.days.length, exerciseCount)}
          </Text>
        </View>

        <ReorderableRows
          items={plan.days}
          keyOf={(d) => d.id}
          onDragging={setDragging}
          onMove={move}
          renderRow={(day, i) => (
            <DayRow day={day} index={i} onPress={() => openDay(day)} onRemove={() => remove(day)} />
          )}
          rowHeight={ROW_HEIGHT}
        />

        <View style={styles.addWrap}>
          <Button
            onPress={addDay}
            rightIcon={<Plus color={color.text.onButton} size={24} />}
            size="small"
            title="Add Day"
            variant="outline"
          />
        </View>
      </ScrollView>

      {/* Figma 123:2979: Suggested Week — r12 tiles, brand border on training days. */}
      <View style={styles.week}>
        <Text style={styles.weekLabel}>Suggested Week</Text>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((name, i) => {
            const letter = week[i];
            return (
              <View key={name} style={[styles.tile, letter !== null && styles.tileActive]}>
                <Text numberOfLines={1} style={styles.tileDay}>
                  {name}
                </Text>
                <Text style={[styles.tileLetter, letter === null && styles.tileRest]}>
                  {letter ?? '•'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.bottomBar}>
        <Button
          disabled={exerciseCount === 0}
          onPress={() => {
            activatePlan(id, Date.now());
            router.dismissAll();
          }}
          title="Save Plan"
        />
      </View>
    </View>
  );
}

// Figma 123:2571 "Row": letter (h3 medium) · Day N + lift names; the ✕ takes the
// chevron's place, as on the Day Summary mock — the row itself is the way in.
function DayRow({
  day,
  index,
  onPress,
  onRemove,
}: {
  day: PlanDaySummary;
  index: number;
  onPress: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityHint="Opens this day"
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.rowBody, pressed && styles.rowPressed]}
      >
        <Text style={styles.rowLetter}>{dayLetter(index)}</Text>
        <View style={styles.rowText}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {day.name}
          </Text>
          <Text numberOfLines={1} style={styles.rowCaption}>
            {day.exerciseNames.length > 0 ? day.exerciseNames.join(' • ') : 'No exercises yet'}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={`Remove ${day.name}`}
        accessibilityRole="button"
        onPress={onRemove}
        style={({ pressed }) => [styles.remove, pressed && styles.rowPressed]}
      >
        <X color={color.text.primary} size={24} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  scroll: { paddingTop: 24, gap: 32 },
  titleBlock: { paddingHorizontal: 24, paddingVertical: 4, gap: 8 },
  h1: { ...type.h1, color: color.text.primary },
  subtitle: { fontFamily: 'Geom', fontSize: 20, fontWeight: '400', color: color.text.secondary },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 12 },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingRight: 8,
    borderRadius: 8,
  },
  rowPressed: { backgroundColor: color.bg.raised },
  rowLetter: { ...type.h3, color: color.text.secondary, minWidth: 24 },
  rowText: { gap: 8, flex: 1 },
  rowTitle: { ...type.title, color: color.text.primary },
  rowCaption: { ...type.caption, color: color.text.secondary },
  remove: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  addWrap: { paddingHorizontal: 24 },
  week: { paddingHorizontal: 24, paddingTop: 16, gap: 8 },
  weekLabel: { ...type.label, color: color.text.secondary },
  weekRow: { flexDirection: 'row', gap: 8 },
  // Seven across at 412 leaves ~45 each: the frame's p12 would squeeze "Mon" to two
  // lines on a real phone, so the sides go to 4 and the vertical keeps the frame's 12.
  tile: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 10,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.border,
  },
  tileActive: { borderColor: color.brand },
  tileDay: { ...type.caption, color: color.text.primary },
  tileLetter: { ...type.label, color: color.text.primary },
  tileRest: { color: color.border },
  bottomBar: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
});
