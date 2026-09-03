import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color } from '@/theme/tokens';

// The Bottom Drawer pattern (Figma 403:13713): a dark sheet with the 64×8 handle
// (403:13714) sliding up over a dimmed page. The top border is Justin's call
// (2026-09-02): without the dim and a hairline, the sheet vanished into the screen.
// The Modal floats outside the inset-padded screen root, so the sheet carries its own
// bottom inset.

type BottomSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
};

export function BottomSheet({ visible, onDismiss, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="slide" onRequestClose={onDismiss} transparent visible={visible}>
      <Pressable accessibilityLabel="Dismiss" onPress={onDismiss} style={styles.scrim} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.handle} />
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // The dim behind the drawer — an overlay, not a surface, so no palette step fits it.
  scrim: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    backgroundColor: color.bg.base,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: color.border,
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
});
