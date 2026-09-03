import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { color, type } from '@/theme/tokens';

// ⚠️ UNDESIGNED — the Bottom Drawer with a question in it. Ending a workout always
// double-confirms (Justin, 2026-09-02). Copy follows the watch End Workout
// Confirmation (164:4371), with "miss" corrected to failure semantics per the data
// model. Replace when designed.

export function ConfirmEndSheet({
  visible,
  setsDone,
  setsTotal,
  onCancel,
  onEnd,
}: {
  visible: boolean;
  setsDone: number;
  setsTotal: number;
  onCancel: () => void;
  onEnd: () => void;
}) {
  const early = setsDone < setsTotal;
  return (
    <BottomSheet onDismiss={onCancel} visible={visible}>
      <View style={styles.body}>
        <Text style={styles.title}>End Workout?</Text>
        <Text style={styles.text}>
          {early
            ? `Only ${setsDone} of ${setsTotal} sets done. Unfinished lifts count as failures and may trigger a deload.`
            : 'All sets done. Nice work.'}
        </Text>
        <View style={styles.buttons}>
          <View style={styles.grow}>
            <Button onPress={onCancel} title="Cancel" variant="secondary" />
          </View>
          <View style={styles.grow}>
            <Button onPress={onEnd} title="End" />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 24, gap: 16 },
  title: { ...type.h2, color: color.text.primary },
  text: { ...type.body, lineHeight: 24, color: color.text.secondary },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  grow: { flex: 1 },
});
