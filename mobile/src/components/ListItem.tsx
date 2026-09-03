import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, type } from '@/theme/tokens';

// Figma: Select/List Item 114:2626 (412×80) — the Search Exercise row and the
// Progression / Pacing rows on Add Exercise Details: title (Title) over a caption
// (Caption, secondary), an optional 64px leading slot, and a trailing slot for a Go
// button or chevron. Pressable only when given onPress.

type ListItemProps = {
  title: string;
  caption?: string;
  /** Caption fragment drawn in brand before the caption (Day Summary's override). */
  captionAccent?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
};

export function ListItem({
  title,
  caption,
  captionAccent,
  leading,
  trailing,
  onPress,
}: ListItemProps) {
  const body = (
    <>
      <View style={styles.left}>
        {leading}
        <View style={styles.text}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {(caption !== undefined || captionAccent !== undefined) && (
            <Text numberOfLines={1} style={styles.caption}>
              {captionAccent !== undefined && <Text style={styles.accent}>{captionAccent} • </Text>}
              {caption}
            </Text>
          )}
        </View>
      </View>
      {trailing}
    </>
  );
  if (!onPress) return <View style={styles.root}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Figma: px24 py16 (details rows) / py12 with a 64px leading (search rows) — the
  // minHeight keeps both at the file's 80/88.
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 80,
  },
  pressed: { backgroundColor: color.bg.raised },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  text: { gap: 8, flexShrink: 1 },
  title: { ...type.title, color: color.text.primary },
  caption: { ...type.caption, color: color.text.secondary },
  accent: { color: color.brand },
});
