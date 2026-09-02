import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { color, type } from '@/theme/tokens';

// ⚠️ UNDESIGNED — a minimal bottom sheet in the Bottom Drawer pattern (handle from
// 403:13714, dark raised surface). Ending a workout always double-confirms (Justin,
// 2026-09-02). Copy follows the watch End Workout Confirmation (164:4371), with
// "miss" corrected to failure semantics per the data model. Replace when designed.

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
  // The Modal floats outside the inset-padded screen root, so the sheet carries its
  // own bottom inset (Justin's round 4: buttons sat flush on the 3-button nav bar).
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="slide" onRequestClose={onCancel} transparent visible={visible}>
      <Pressable onPress={onCancel} style={styles.scrim} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>End Workout?</Text>
        <Text style={styles.body}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    backgroundColor: color.bg.base,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 64,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.border,
    marginBottom: 8,
  },
  title: { ...type.h2, color: color.text.primary },
  body: { ...type.body, lineHeight: 24, color: color.text.secondary },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  grow: { flex: 1 },
});
