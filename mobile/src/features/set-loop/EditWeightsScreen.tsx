import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Keypad, type KeypadKey } from '@/components/Keypad';
import { TopBar } from '@/components/TopBar';
import { WeightReadout } from '@/components/WeightReadout';
import { color, type } from '@/theme/tokens';
import { currentExercise, type Dispatch } from './session-ui';
import type { SessionState } from './types';

// Edit Weights (Figma 34:695 / 34:1236 / 34:960 — three frames, one screen): the
// readout with the was/delta line, a [−5][Custom][+5] row, Save Changes. Custom swaps
// the stepper row for the keypad (34:960). Back abandons the edit.

export function EditWeightsScreen({
  state,
  dayName,
  onEvent,
}: {
  state: SessionState;
  dayName: string;
  onEvent: Dispatch;
}) {
  const exercise = currentExercise(state);
  const [mode, setMode] = useState<'stepper' | 'keypad'>('stepper');
  const [stepped, setStepped] = useState(exercise.weight);
  const [draft, setDraft] = useState('');

  const value = mode === 'keypad' ? (draft === '' ? exercise.weight : Number(draft)) : stepped;
  const dirty = mode === 'keypad' ? draft !== '' : stepped !== exercise.weight;

  const onKey = (key: KeypadKey) => {
    setDraft((d) => {
      if (key === 'delete') return d.slice(0, -1).replace(/\.$/, '');
      if (key === '.5') return d === '' || d.includes('.') ? d : `${d}.5`;
      if (d.includes('.')) return d; // digits after .5 make no loadable weight
      return d.length >= 4 ? d : d === '0' ? key : d + key;
    });
  };

  return (
    <View style={styles.root}>
      <TopBar
        left={<ArrowLeft color={color.text.primary} size={24} />}
        onPressLeft={() => onEvent({ type: 'weightEditClosed' })}
        title={`${dayName} • ${exercise.name} • Edit Weight`}
      />
      <View style={styles.center}>
        <WeightReadout unit="Lbs" value={value} was={exercise.weight} />
      </View>

      {mode === 'stepper' ? (
        // The [−5][Custom][+5] row, node 34:756 — Secondary recipe, ±5 like the plates.
        <View style={styles.stepperRow}>
          <StepKey label="-5" onPress={() => setStepped((w) => Math.max(0, w - 5))} />
          <View style={styles.grow}>
            <Button onPress={() => setMode('keypad')} title="Custom" variant="secondary" />
          </View>
          <StepKey label="+5" onPress={() => setStepped((w) => w + 5)} />
        </View>
      ) : (
        <Keypad onKey={onKey} />
      )}

      <Text style={styles.caption}>Applies to future sets and workouts</Text>
      <View style={styles.bottomBar}>
        <Button
          disabled={!dirty || value <= 0}
          onPress={() => onEvent({ type: 'weightSaved', weight: value })}
          title="Save Changes"
        />
      </View>
    </View>
  );
}

function StepKey({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.stepKey, pressed && styles.stepKeyPressed]}
    >
      <Text style={styles.stepLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stepperRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, alignItems: 'center' },
  grow: { flex: 1 },
  stepKey: {
    minWidth: 64,
    minHeight: 64,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg.raised,
  },
  stepKeyPressed: { backgroundColor: color.press.raised },
  stepLabel: { ...type.button, color: color.text.onButton },
  caption: { ...type.bodyLight, color: color.text.secondary, textAlign: 'center', marginTop: 16 },
  bottomBar: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
});
