import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { color, type } from '@/theme/tokens';

// ⚠️ UNDESIGNED — the Bottom Drawer with a question in it: a title, a line of
// consequence, Cancel beside the solid confirm. Anything that ends a workout asks this
// way (Justin, 2026-09-02: session-enders always double-confirm). Copy is the caller's;
// replace the drawing when designed.

type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  message: string;
  /** The solid button's label — say what happens ("End", "End & Start"). */
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmSheetProps) {
  return (
    <BottomSheet onDismiss={onCancel} visible={visible}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{message}</Text>
        <View style={styles.buttons}>
          <View style={styles.grow}>
            <Button onPress={onCancel} title="Cancel" variant="secondary" />
          </View>
          <View style={styles.grow}>
            <Button onPress={onConfirm} title={confirmLabel} />
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
