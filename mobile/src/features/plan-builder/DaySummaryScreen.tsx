import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ReorderableRows } from '@/components/ReorderableRows';
import { TopBar } from '@/components/TopBar';
import {
  loadDay,
  removePlanExercise,
  reorderPlanExercises,
  type BuilderDay,
  type DayExercise,
} from '@/lib/db/plan-store';
import { color, type } from '@/theme/tokens';
import {
  daySubtitle,
  formatNumber,
  muscleGroupCount,
  plannedVolume,
  rowCaption,
  totalSets,
} from './day-summary';
import { moveItem } from './reorder';

// Day Summary (Figma 123:1944) in its edit state (Justin's mock, 2026-09-02): every row
// has a ✕ that removes the lift, the rest of the row reopens it for editing, and the
// grip drags it into a new order. Add Workout, the three stat tiles, and Save Day, which
// returns to Plan Summary (123:2530) — Save Plan there is what makes the plan active.

const ROW_HEIGHT = 80;

export function DaySummaryScreen() {
  const insets = useSafeAreaInsets();
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const [day, setDay] = useState<BuilderDay | null>(null);
  const [dragging, setDragging] = useState(false);
  // Re-read on focus: Add to Day / Save Changes land back here with the rows changed.
  useFocusEffect(
    useCallback(() => {
      const id = setTimeout(() => setDay(dayId ? loadDay(dayId) : null), 0);
      return () => clearTimeout(id);
    }, [dayId]),
  );

  if (!day) return <View style={[styles.root, { paddingTop: insets.top }]} />;
  const lifts = day.exercises;
  const dayIdSafe = day.dayId;

  const remove = (id: string) => {
    removePlanExercise(id);
    setDay(loadDay(dayIdSafe));
  };
  const move = (from: number, to: number) => {
    const next = moveItem(lifts, from, to);
    reorderPlanExercises(
      dayIdSafe,
      next.map((e) => e.id),
    );
    setDay({ ...day, exercises: next });
  };
  const edit = (e: DayExercise) =>
    router.push({
      pathname: '/plan/day/[dayId]/add/[exerciseId]',
      params: { dayId: dayIdSafe, exerciseId: e.exerciseId, planExerciseId: e.id },
    });

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TopBar
        left={<ArrowLeft color={color.text.primary} size={24} />}
        onPressLeft={() => router.back()}
        title={`${day.planName} • ${day.dayName}`}
      />
      <ScrollView contentContainerStyle={styles.scroll} scrollEnabled={!dragging}>
        <View style={styles.titleBlock}>
          <Text style={styles.h1}>{day.dayName}</Text>
          <Text style={styles.subtitle}>{daySubtitle(day.planStrategy, lifts)}</Text>
        </View>

        <ReorderableRows
          items={lifts}
          keyOf={(e) => e.id}
          onDragging={setDragging}
          onMove={move}
          renderRow={(e, i) => (
            <LiftRow index={i + 1} lift={e} onPress={() => edit(e)} onRemove={() => remove(e.id)} />
          )}
          rowHeight={ROW_HEIGHT}
        />

        <View style={styles.addWrap}>
          <Button
            onPress={() =>
              router.push({ pathname: '/plan/day/[dayId]/search', params: { dayId: dayIdSafe } })
            }
            rightIcon={<Plus color={color.text.onButton} size={24} />}
            size="small"
            title="Add Workout"
            variant="outline"
          />
        </View>
      </ScrollView>

      <View style={styles.tiles}>
        <StatTile label="Total Sets" value={String(totalSets(lifts))} />
        <StatTile label="Lbs Volume" value={formatNumber(plannedVolume(lifts))} />
        <StatTile label="Muscle Groups" value={String(muscleGroupCount(lifts))} />
      </View>
      <View style={styles.bottomBar}>
        <Button
          disabled={lifts.length === 0}
          onPress={() =>
            router.dismissTo({ pathname: '/plan/[planId]', params: { planId: day.planId } })
          }
          title="Save Day"
        />
      </View>
    </View>
  );
}

// Figma 123:1952 "Line-Item" + the mock's ✕: number · name + caption · weight and
// sets×reps · remove. The row body opens the lift; only the ✕ removes it.
function LiftRow({
  index,
  lift,
  onPress,
  onRemove,
}: {
  index: number;
  lift: DayExercise;
  onPress: () => void;
  onRemove: () => void;
}) {
  const caption = rowCaption(lift);
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityHint="Opens this lift to edit it"
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.rowBody, pressed && styles.rowPressed]}
      >
        <Text style={styles.rowIndex}>{index}</Text>
        <View style={styles.rowText}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {lift.name}
          </Text>
          <Text numberOfLines={1} style={styles.rowCaption}>
            {caption.override && <Text style={styles.rowOverride}>{caption.override} • </Text>}
            {caption.rest}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowWeight}>{lift.startWeight}</Text>
          <Text style={styles.rowSets}>
            {lift.sets}x{lift.reps}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={`Remove ${lift.name}`}
        accessibilityRole="button"
        onPress={onRemove}
        style={({ pressed }) => [styles.remove, pressed && styles.rowPressed]}
      >
        <X color={color.text.primary} size={24} />
      </Pressable>
    </View>
  );
}

// Figma 123:3021: r12 bordered tile, h3 number over a caption.
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
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
  rowIndex: { ...type.title, color: color.text.secondary, width: 16, textAlign: 'center' },
  rowText: { gap: 4, flex: 1 },
  rowTitle: { ...type.title, color: color.text.primary },
  rowCaption: { ...type.caption, color: color.text.secondary },
  rowOverride: { color: color.brand },
  rowRight: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  rowWeight: { ...type.titleValue, color: color.text.primary },
  rowSets: { ...type.label, color: color.text.secondary, minWidth: 32 },
  remove: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  addWrap: { paddingHorizontal: 24 },
  tiles: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingTop: 16 },
  tile: {
    flex: 1,
    padding: 12,
    gap: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.border,
  },
  tileValue: { ...type.h3, color: color.text.primary },
  tileLabel: { ...type.caption, color: color.text.secondary },
  bottomBar: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
});
