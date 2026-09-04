import { Info } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { RadioCard } from '@/components/RadioCard';
import { SegmentedButtons } from '@/components/SegmentedButtons';
import { color, type } from '@/theme/tokens';
import { SettingsSubscreen } from './SettingsSubscreen';
import { useProfile } from './useProfile';

// Dumbbell Scale (Figma 433:22844): the unit, and the rack's smallest jump — 5 lb racks
// go 10 · 15 · 20, 2.5 lb racks 10 · 12.5 · 15. This is `Profile.smallestStepDumbbell`,
// which the progression rounding (features/progression/rounding.ts) will read for
// dumbbell lifts; today every lift rounds to 5. The frame draws the scale in pounds only,
// so the cards stay in pounds whichever unit is chosen.

const UNITS = [
  { value: 'kg', label: 'Kgs' },
  { value: 'lb', label: 'Lbs' },
] as const;

const SCALES = [
  { step: 5, label: '5 Lb', examples: ['10', '15', '20', '25', '30'] },
  { step: 2.5, label: '2.5 Lb', examples: ['10', '12.5', '15', '17.5', '20'] },
];

export function UnitScaleScreen() {
  const [profile, update] = useProfile();
  return (
    <SettingsSubscreen barTitle="Dumbbell scale" title="Dumbbell Scale">
      <SegmentedButtons
        label="Unit"
        onChange={(unit) => update({ unit })}
        options={UNITS}
        value={profile?.unit ?? 'lb'}
      />
      <View style={styles.list}>
        <Text style={styles.label}>Increments</Text>
        {SCALES.map((scale) => (
          <RadioCard
            checkbox
            key={scale.step}
            onPress={() => update({ smallestStepDumbbell: scale.step })}
            selected={profile?.smallestStepDumbbell === scale.step}
            title={scale.label}
          >
            <View style={styles.examples}>
              {scale.examples.map((n) => (
                <Chip key={n} label={n} />
              ))}
            </View>
          </RadioCard>
        ))}
      </View>
      {/* The outline Card (359:1596) with the info glyph — the only place it is used. */}
      <View style={styles.note}>
        <Info color={color.text.secondary} size={16} />
        <Text style={styles.noteText}>Impacts progression increases</Text>
      </View>
    </SettingsSubscreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  label: { ...type.body, color: color.text.secondary },
  examples: { flexDirection: 'row', gap: 4 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.border,
  },
  noteText: { ...type.body, color: color.text.secondary },
});
