import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { applyByFeel } from '@/features/progression/by-feel';
import { scoreExercise } from '@/features/progression/scoring';
import { Button } from '@/components/Button';
import { TopBar } from '@/components/TopBar';
import { loadAllProgress, type StoredProgress } from '@/lib/db/progress-store';
import { color, type } from '@/theme/tokens';
import { prescriptionFor } from './settle-session';
import type { Dispatch } from './session-ui';
import type { FeelRating, SessionState } from './types';

// The By Feel poke grid — "How was it?" (Figma 384:10881, engine 384:11049). Appears
// when a by-feel lift finishes its sets. The quadrants are the visual; the *poke* is
// positional: x → form (clean | bad), y → reps left in the tank in five bands
// (Nothing Left 0 · 1 · 2 · 3 · 4+ Plenty Left). Auto-skips after 8 s — a skip
// repeats the progression.

const SKIP_MS = 8_000;

// Each quadrant carries a color (engine section 384:11049: yellow · red · green · red)
// used for the poke dot, the prediction line, and nothing else.
const QUADRANT = {
  'clean-high': { tint: color.warning, blurb: 'Difficult, but your form held' },
  'bad-high': { tint: color.brand, blurb: 'Too heavy — form broke down' },
  'clean-low': { tint: color.success, blurb: 'Strong, with room to spare' },
  'bad-low': { tint: color.brand, blurb: 'Form broke with reps in the tank' },
} as const;

function quadrantOf(rating: FeelRating) {
  const high = rating.reserve === '0' || rating.reserve === '1';
  return `${rating.form === 'clean' ? 'clean' : 'bad'}-${high ? 'high' : 'low'}` as const;
}

export function ByFeelGridScreen({
  state,
  exerciseIndex,
  dayName,
  onEvent,
}: {
  state: SessionState;
  exerciseIndex: number;
  dayName: string;
  onEvent: Dispatch;
}) {
  const ex = state.exercises[exerciseIndex];
  const [rating, setRating] = useState<FeelRating | null>(null);
  const [poke, setPoke] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ w: 1, h: 1 });
  // Prior progress feeds the live prediction (impure read → effect, never render).
  const [prior, setPrior] = useState<Record<string, StoredProgress> | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setPrior(loadAllProgress()), 0);
    return () => clearTimeout(id);
  }, []);

  // The 8s skip — cancelled the moment a poke lands.
  useEffect(() => {
    if (rating) return;
    const id = setTimeout(
      () => onEvent({ type: 'feelRated', exerciseIndex, rating: null }),
      SKIP_MS,
    );
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEvent is stable enough; re-arm only on rating
  }, [rating, exerciseIndex]);

  const onLayout = (e: LayoutChangeEvent) =>
    setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const onPoke = (x: number, y: number) => {
    const bands: FeelRating['reserve'][] = ['0', '1', '2', '3', '4plus'];
    const band = Math.min(4, Math.max(0, Math.floor((y / size.h) * 5)));
    setRating({ form: x < size.w / 2 ? 'clean' : 'bad', reserve: bands[band] });
    setPoke({ x, y });
  };

  // The card previews what Log Feel will actually do — same engine, same rules as
  // settle — colored by the quadrant. Before a poke it stays gray with the skip note.
  const quadrant = rating ? QUADRANT[quadrantOf(rating)] : null;
  const preview = (() => {
    if (!rating) return { reps: ex.targetReps, weight: ex.weight };
    const rx = prescriptionFor(ex);
    const logged = state.sets
      .filter((s) => s.exerciseIndex === exerciseIndex)
      .map((s) => ({ reps: s.reps }));
    const outcome = scoreExercise(rx, logged) === 'hit' ? 'hit' : 'failed';
    const stored = prior?.[ex.exerciseId];
    const { progress } = applyByFeel(
      {
        currentWeight: ex.weight,
        currentReps: ex.targetReps,
        consecutiveFailures: stored?.consecutiveFailures ?? 0,
        lastOutcome: stored?.lastOutcome ?? null,
      },
      { outcome, rating },
      stored
        ? {
            outcome: stored.lastOutcome ?? 'hit',
            rating:
              stored.lastReserve && stored.lastForm
                ? { reserve: stored.lastReserve, form: stored.lastForm }
                : null,
            heldAtTop: stored.heldAtTop,
          }
        : null,
      rx,
    );
    return { reps: progress.currentReps, weight: progress.currentWeight };
  })();

  return (
    <View style={styles.root}>
      <TopBar title={`${ex.name} • ${ex.prescribedSets}x${ex.targetReps} @ ${ex.weight} Done`} />
      <View style={styles.body}>
        <View style={styles.titleBlock}>
          <Text style={styles.h1}>How was it?</Text>
          <Text style={styles.subtitle}>Tap below to progress by feel</Text>
        </View>

        <View onLayout={onLayout} style={styles.grid}>
          <Pressable
            accessibilityHint="left is clean form, right is bad form; top is nothing left, bottom is plenty left"
            accessibilityLabel="How did the sets feel?"
            onPress={(e) => onPoke(e.nativeEvent.locationX, e.nativeEvent.locationY)}
            style={styles.gridPress}
          >
            {/* Decorative only — pointerEvents none so every touch lands on the
                Pressable itself and locationX/Y are grid-relative (touching a child
                made coordinates cell-relative, which pinned every poke upper-left). */}
            <View pointerEvents="none" style={styles.cells}>
              <View style={styles.cell} />
              <View style={styles.cell} />
              <View style={styles.cell} />
              <View style={styles.cell} />
            </View>
            <View pointerEvents="none" style={styles.xLabels}>
              <Text style={styles.axis}>Clean</Text>
              <Text style={styles.axis}>Bad Form</Text>
            </View>
            <View pointerEvents="none" style={styles.yLabels}>
              <Text style={styles.axis}>Nothing Left</Text>
              <Text style={styles.axis}>Plenty Left</Text>
            </View>
            {poke && quadrant && (
              <View
                pointerEvents="none"
                style={[
                  styles.pokeDot,
                  { left: poke.x - 12, top: poke.y - 12, backgroundColor: quadrant.tint },
                ]}
              />
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardBody}>
            {quadrant ? quadrant.blurb : 'Skipping will repeat this set'}
          </Text>
          {/* "Next session" not the lift name — insulated against long names (Justin). */}
          <Text style={[styles.cardStrong, quadrant && { color: quadrant.tint }]}>
            Next session is {preview.weight} x {preview.reps}
          </Text>
        </View>
      </View>

      <Text style={styles.hint}>Skips after 8s • A skip repeats progression</Text>
      <View style={styles.bottomBar}>
        {/* Grays until a poke lands; then color arrives (frames 384:10881 → 380:10489). */}
        <Button
          disabled={!rating}
          onPress={() => rating && onEvent({ type: 'feelRated', exerciseIndex, rating })}
          title="Log Feel"
          variant={rating ? 'solid' : 'secondary'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  body: { flex: 1, paddingTop: 24, gap: 24 },
  titleBlock: { paddingHorizontal: 24, gap: 8 },
  h1: { ...type.h1, color: color.text.primary },
  subtitle: { fontFamily: 'Geom', fontSize: 20, fontWeight: '400', color: color.text.secondary },
  // Figma: 365×292, r12, quadrants on the raised bg with border lines.
  grid: { marginHorizontal: 24, height: 292 },
  gridPress: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
  },
  cells: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '50%',
    height: '50%',
    backgroundColor: color.bg.raised,
    borderWidth: 0.5,
    borderColor: color.border,
  },
  xLabels: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  yLabels: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  axis: { ...type.label, color: color.text.primary },
  pokeDot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  card: {
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 12,
    backgroundColor: color.bg.raised,
    gap: 4,
  },
  cardBody: { ...type.body, color: color.text.primary },
  cardStrong: { ...type.h3Bold, color: color.text.secondary },
  hint: {
    ...type.bodyLight,
    color: color.text.secondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  bottomBar: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
});
