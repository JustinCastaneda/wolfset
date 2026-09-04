import { StyleSheet, View } from 'react-native';

import { RadioCard } from '@/components/RadioCard';
import type { Goal } from '@/lib/db/profile-store';
import { SettingsSubscreen } from './SettingsSubscreen';
import { useProfile } from './useProfile';

// Goal (Figma 433:27536): one of four, Vibing being "no particular goal". The row on
// Settings promises it "changes suggested workouts" — the preset plans (Select a Plan)
// will read it; nothing does yet.

const GOALS: { value: Goal; title: string; description: string }[] = [
  {
    value: 'muscle',
    title: 'Build Muscle',
    description: 'MesoCycle Plans that optimize progressive overload and build muscle fast.',
  },
  {
    value: 'strength',
    title: 'Build Strength',
    description:
      'MesoCycle Plans that optimize core strength, flexibility and overall body health.',
  },
  {
    value: 'endurance',
    title: 'Endurance',
    description: 'A blend of cardio and high rep plans that optimize for endurance and VO2 Max.',
  },
  {
    value: 'vibing',
    title: 'Vibing',
    description: 'Just here for the pump. No specific goal in mind.',
  },
];

export function GoalScreen() {
  const [profile, update] = useProfile();
  return (
    <SettingsSubscreen barTitle="Goal" title="Goal">
      <View style={styles.list}>
        {GOALS.map((goal) => (
          <RadioCard
            description={goal.description}
            key={goal.value}
            onPress={() => update({ goal: goal.value })}
            selected={profile?.goal === goal.value}
            title={goal.title}
          />
        ))}
      </View>
    </SettingsSubscreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 16 },
});
