import { ListTree, Settings2, X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Input } from '@/components/Input';
import { Keypad } from '@/components/Keypad';
import { SegmentedProgress } from '@/components/SegmentedProgress';
import { TimerRing } from '@/components/TimerRing';
import { TopBar } from '@/components/TopBar';
import { WeightReadout } from '@/components/WeightReadout';
import { color, palette, type } from '@/theme/tokens';

// The Design Kit (plan 3d): every component and variant on one screen, so Justin can hold
// the phone next to Figma and compare. Renders nothing outside dev — Metro strips the
// __DEV__ branch from production bundles, so the kit's content tree-shakes away.

export default function DesignKit() {
  const insets = useSafeAreaInsets();
  if (!__DEV__) return null;
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
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
      <Text style={styles.caption}>Toggleable — tap to select, hold to see the press shade</Text>
      <ToggleChipsDemo />

      <Text style={styles.section}>Input — default · filled · error · required + count</Text>
      <View style={styles.group}>
        <Input label="Label" placeholder="Placeholder Text" />
        <Input label="Email" value="justin@brethrenstudios.com" onChangeText={() => {}} />
        <Input label="Weight" required error helperText="Enter a weight" placeholder="0" />
        <CountedInputDemo />
      </View>

      <Text style={styles.section}>Top Bar — centered · left-aligned (lucide chrome)</Text>
      <TopBar
        left={<ListTree color={color.text.primary} size={24} />}
        right={<X color={color.text.primary} size={24} />}
        title="Plan A • Squat • 4/5"
      />
      <TopBar
        align="left"
        right={<Settings2 color={color.text.primary} size={24} />}
        title="Plan A • Squat • 4/5"
      />

      <Text style={styles.section}>Timer ring — resting · approaching · ready</Text>
      <View style={styles.chipRow}>
        <TimerRing progress={0.85} size={100} zone="resting" />
        <TimerRing progress={0.45} size={100} zone="approaching" />
        <TimerRing progress={0.12} size={100} zone="ready" />
      </View>

      <Text style={styles.section}>Sets bar — 5 done, 1 current, 2 up</Text>
      <SegmentedProgress done={5} total={8} />

      <Text style={styles.section}>Weight readout — up · down · unchanged</Text>
      <WeightReadout unit="Lbs" value={245} was={200} />
      <WeightReadout unit="Lbs" value={195} was={205} />
      <WeightReadout unit="Lbs" value={135} />

      <Text style={styles.section}>Keypad</Text>
      <Keypad onKey={() => {}} />

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

// The counter needs a controlled input — value + onChangeText — which screens will
// always have. The kit fakes the screen's state here.
function CountedInputDemo() {
  const [name, setName] = useState('');
  return (
    <Input
      helperText=" "
      label="Plan name"
      maxLength={100}
      onChangeText={setName}
      placeholder="Winter Bulk"
      showCount
      value={name}
    />
  );
}

function ToggleChipsDemo() {
  const [on, setOn] = useState<Record<string, boolean>>({});
  return (
    <View style={styles.chipRow}>
      {(['brand', 'muted', 'outline'] as const).map((variant) => (
        <Chip
          key={variant}
          label={variant}
          onPress={() => setOn((prev) => ({ ...prev, [variant]: !prev[variant] }))}
          selected={!!on[variant]}
          size="large"
          variant={variant}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  content: { paddingHorizontal: 16, gap: 12 },
  h1: { ...type.h1, color: color.text.primary },
  section: { ...type.label, color: color.text.secondary, marginTop: 16 },
  caption: { ...type.caption, color: color.text.muted },
  group: { gap: 8 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sample: { color: color.text.primary },
  swatch: { width: 28, height: 28, borderRadius: 4 },
  swatchLabel: { ...type.caption, color: color.text.muted },
});
