import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { color, palette, type } from '@/theme/tokens';

// The Design Kit (plan 3d): every component and variant on one screen, so Justin can hold
// the phone next to Figma and compare. Renders nothing outside dev — Metro strips the
// __DEV__ branch from production bundles, so the kit's content tree-shakes away.

export default function DesignKit() {
  if (!__DEV__) return null;
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Design Kit</Text>

      <Text style={styles.section}>Button — Solid · Outline · Ghost · Secondary</Text>
      {(['solid', 'outline', 'ghost', 'secondary'] as const).map((variant) => (
        <View key={variant} style={styles.group}>
          <Button title={`${variant} large`} variant={variant} size="large" />
          <Button title={`${variant} small`} variant={variant} size="small" />
          <Button title="disabled" variant={variant} size="small" disabled />
        </View>
      ))}

      <Text style={styles.section}>Chip — Brand · Muted · Outline (idle / selected)</Text>
      {(['brand', 'muted', 'outline'] as const).map((variant) => (
        <View key={variant} style={styles.chipRow}>
          <Chip label={variant} variant={variant} size="small" />
          <Chip label={variant} variant={variant} size="small" selected />
          <Chip label={variant} variant={variant} size="large" />
          <Chip label={variant} variant={variant} size="large" selected />
        </View>
      ))}

      <Text style={styles.section}>Type scale — Geom</Text>
      {Object.entries(type).map(([name, style]) => (
        <Text key={name} numberOfLines={1} style={[style, styles.sample]}>
          {name} {style.fontSize}px
        </Text>
      ))}

      <Text style={styles.section}>Palette</Text>
      {Object.entries(palette).map(([scale, steps]) => (
        <View key={scale} style={styles.chipRow}>
          {Object.entries(steps).map(([step, hex]) => (
            <View key={step} style={[styles.swatch, { backgroundColor: hex }]} />
          ))}
          <Text style={styles.swatchLabel}>{scale}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  content: { padding: 16, paddingTop: 64, gap: 12, paddingBottom: 64 },
  h1: { ...type.h1, color: color.text.primary },
  section: { ...type.label, color: color.text.secondary, marginTop: 16 },
  group: { gap: 8 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sample: { color: color.text.primary },
  swatch: { width: 28, height: 28, borderRadius: 4 },
  swatchLabel: { ...type.caption, color: color.text.muted },
});
