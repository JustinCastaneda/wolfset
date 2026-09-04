import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RowChevron } from '@/components/RowChevron';
import { color, type } from '@/theme/tokens';

// Figma: Select/List Item 114:2626 (412×80) — the Search Exercise row and the
// Progression / Pacing rows on Add Exercise Details: title (Title) over a caption
// (Caption, secondary), an optional 64px leading slot, and a trailing slot for a Go
// button, or the row's own chevron. Pressable only when given onPress. A row is flush
// with the background even while pressed (Justin, 2026-09-04: a fill would cover the
// watermark); the chevron carries the press instead (RowChevron).

type ListItemProps = {
  title: string;
  /** A brand caption beside the title — the hub row's "Up Next" (node 48:397). */
  titleTag?: string;
  caption?: string;
  /** Caption fragment drawn in brand before the caption (Day Summary's override). */
  captionAccent?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** The row leads somewhere: a chevron in the trailing slot, disabled without onPress. */
  chevron?: boolean;
  onPress?: () => void;
};

export function ListItem({
  title,
  titleTag,
  caption,
  captionAccent,
  leading,
  trailing,
  chevron = false,
  onPress,
}: ListItemProps) {
  const body = (pressed: boolean) => (
    <>
      <View style={styles.left}>
        {leading}
        <View style={styles.text}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            {titleTag !== undefined && <Text style={styles.titleTag}>{titleTag}</Text>}
          </View>
          {(caption !== undefined || captionAccent !== undefined) && (
            <Text numberOfLines={1} style={styles.caption}>
              {captionAccent !== undefined && <Text style={styles.accent}>{captionAccent} • </Text>}
              {caption}
            </Text>
          )}
        </View>
      </View>
      {trailing}
      {chevron && <RowChevron disabled={!onPress} pressed={pressed} />}
    </>
  );
  if (!onPress) return <View style={styles.root}>{body(false)}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.root}>
      {({ pressed }) => body(pressed)}
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
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  text: { gap: 8, flexShrink: 1 },
  // Figma 48:260: title and tag share a baseline, 8 apart; the title yields first.
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title: { ...type.title, color: color.text.primary, flexShrink: 1 },
  titleTag: { ...type.caption, color: color.brand },
  caption: { ...type.caption, color: color.text.secondary },
  accent: { color: color.brand },
});
