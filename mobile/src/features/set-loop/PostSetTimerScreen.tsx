import { ArrowBigRight, HeartPulse, ListTree } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { SegmentedProgress } from '@/components/SegmentedProgress';
import { TimerRing } from '@/components/TimerRing';
import { TopBar } from '@/components/TopBar';
import type { HeartRate } from '@/features/hr/useHeartRate';
import { color, type } from '@/theme/tokens';
import { restRemaining } from './machine';
import { exerciseProgress, formatClock, loopTitle, type Dispatch } from './session-ui';
import type { SessionState } from './types';

// Post Set Timer (Figma 25:292 red · 10:10447 yellow · 25:257 green): the ring with the
// countdown inside, the HR line, a coaching caption, Continue. Ring length is time; ring
// color is the HR zone from the watch. Recovered (green, "Let it rip") turns Continue
// Solid — the gate arms the button, it never presses it (brief §01). With no watch signal
// the zone falls back to time: first half resting, second half approaching.

export function PostSetTimerScreen({
  state,
  dayName,
  now,
  onEvent,
  onOverview,
  hr,
}: {
  state: SessionState;
  dayName: string;
  now: number;
  onEvent: Dispatch;
  onOverview: () => void;
  hr: HeartRate;
}) {
  if (state.phase.name !== 'resting') return null;
  const remaining = restRemaining(state, now) ?? 0;
  const fraction = state.phase.restSeconds > 0 ? remaining / state.phase.restSeconds : 0;
  const zone = state.phase.recovered
    ? 'ready'
    : (hr.zone ?? (fraction > 0.5 ? 'resting' : 'approaching'));
  const caption = hr.lost
    ? 'Watch signal lost'
    : zone === 'ready'
      ? 'Let it rip'
      : zone === 'resting'
        ? 'Take it easy'
        : 'Go with what feels right';
  const { done, total } = exerciseProgress(state);

  return (
    <View style={styles.root}>
      <TopBar
        left={<ListTree color={color.text.primary} size={24} />}
        onPressLeft={onOverview}
        title={loopTitle(dayName, state)}
      />
      <View style={styles.sets}>
        <SegmentedProgress done={done} total={total} />
      </View>

      <View style={styles.center}>
        <TimerRing progress={fraction} zone={zone}>
          <View style={styles.ringInner}>
            <Text style={styles.clock}>{formatClock(remaining)}</Text>
            <View style={styles.hrRow}>
              <HeartPulse color={color.timer[zone]} size={32} />
              <Text style={[styles.bpm, { color: color.timer[zone] }]}>
                {hr.bpm === null ? '––' : Math.round(hr.bpm)}{' '}
                <Text style={styles.bpmUnit}>bpm</Text>
              </Text>
            </View>
          </View>
        </TimerRing>
        <Text style={styles.caption}>{caption}</Text>
      </View>

      <View style={styles.bottomBar}>
        <Button
          onPress={() => onEvent({ type: 'restEnded', reason: 'continue', at: Date.now() })}
          rightIcon={<ArrowBigRight color={color.text.onButton} size={24} />}
          title="Continue"
          variant={state.phase.recovered ? 'solid' : 'secondary'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sets: { paddingHorizontal: 24, paddingVertical: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  ringInner: { alignItems: 'center', gap: 8 },
  clock: { ...type.displayL, color: color.text.primary },
  hrRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  bpm: { ...type.h2 },
  bpmUnit: { ...type.body },
  caption: { ...type.body, color: color.text.secondary, alignSelf: 'stretch', textAlign: 'center' },
  bottomBar: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
});
