import { StyleSheet, Text, View } from 'react-native';

import { RadioCard } from '@/components/RadioCard';
import { SegmentedButtons } from '@/components/SegmentedButtons';
import { Stepper } from '@/components/Stepper';
import type { Experience } from '@/lib/db/profile-store';
import { displayHeight, displayWeight, stepHeight, stepWeight } from '@/lib/units';
import { color, type } from '@/theme/tokens';
import { SettingsSubscreen } from './SettingsSubscreen';
import { useProfile } from './useProfile';

// Personal Info (Figma 433:23386): the unit, bodyweight and height steppers, and the
// experience level. Nothing is entered until the first tap; that tap starts from the
// frame's own figures (165 lb, 5’9”) rather than from zero.

const UNITS = [
  { value: 'kg', label: 'Metric' },
  { value: 'lb', label: 'Imperial' },
] as const;

const FIRST_WEIGHT_LB = 165;
const FIRST_HEIGHT_CM = 175.3;

const EXPERIENCE: { value: Experience; title: string; description: string }[] = [
  {
    value: 'beginner',
    title: 'Beginner',
    description: 'Under a year, still learning the lifts and proper form.',
  },
  {
    value: 'intermediate',
    title: 'Intermediate',
    description: 'A few years, got the lifts down and ready to create programs.',
  },
  {
    value: 'advanced',
    title: 'Advanced',
    description: 'Been at it for years. After serious progress, and training like it.',
  },
];

export function PersonalInfoScreen() {
  const [profile, update] = useProfile();
  const unit = profile?.unit ?? 'lb';
  const weight = profile?.bodyweight ?? null;
  const height = profile?.heightCm ?? null;
  const bumpWeight = (direction: 1 | -1) =>
    update({ bodyweight: stepWeight(weight ?? FIRST_WEIGHT_LB, unit, direction) });
  const bumpHeight = (direction: 1 | -1) =>
    update({ heightCm: stepHeight(height ?? FIRST_HEIGHT_CM, unit, direction) });
  return (
    <SettingsSubscreen barTitle="Personal Settings" title="Personal Info">
      <SegmentedButtons
        label="Unit"
        onChange={(next) => update({ unit: next })}
        options={UNITS}
        value={unit}
      />
      <Stepper
        label={`Your Weight (${unit === 'lb' ? 'Lbs' : 'Kgs'})`}
        onDecrement={() => bumpWeight(-1)}
        onIncrement={() => bumpWeight(1)}
        value={weight === null ? '—' : String(displayWeight(weight, unit))}
      />
      <Stepper
        label="Your Height"
        onDecrement={() => bumpHeight(-1)}
        onIncrement={() => bumpHeight(1)}
        value={height === null ? '—' : displayHeight(height, unit)}
      />
      <View style={styles.group}>
        <Text style={styles.label}>Experience</Text>
        {EXPERIENCE.map((level) => (
          <RadioCard
            description={level.description}
            key={level.value}
            onPress={() => update({ experience: level.value })}
            selected={profile?.experience === level.value}
            title={level.title}
          />
        ))}
      </View>
    </SettingsSubscreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: 16 },
  label: { ...type.body, color: color.text.secondary },
});
