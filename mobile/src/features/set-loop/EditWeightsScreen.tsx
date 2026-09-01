import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Keypad, type KeypadKey } from '@/components/Keypad';
import { TopBar } from '@/components/TopBar';
import { WeightReadout } from '@/components/WeightReadout';
import { color, type } from '@/theme/tokens';
import { currentExercise, type Dispatch } from './session-ui';
import type { SessionState } from './types';

// Edit Weights / Custom (Figma 34:960): the readout with the was/delta line, the
// keypad, Save Changes. A detour off Log a Set — back arrow abandons the edit.

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
  const [draft, setDraft] = useState('');
  const value = draft === '' ? exercise.weight : Number(draft);

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
      <Keypad onKey={onKey} />
      <Text style={styles.caption}>Applies to future sets and workouts</Text>
      <View style={styles.bottomBar}>
        <Button
          disabled={draft === '' || value <= 0}
          onPress={() => onEvent({ type: 'weightSaved', weight: value })}
          title="Save Changes"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  caption: { ...type.bodyLight, color: color.text.secondary, textAlign: 'center' },
  bottomBar: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
});
