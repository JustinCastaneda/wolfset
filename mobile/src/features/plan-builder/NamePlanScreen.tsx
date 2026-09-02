import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Input } from '@/components/Input';
import { TopBar } from '@/components/TopBar';
import { countPlans } from '@/lib/db/plan-store';
import { color, type } from '@/theme/tokens';
import { EXAMPLE_NAME, isValidPlanName, numberedPlanName, surprisePlanName } from './plan-names';

// Name this Plan — the first builder screen (Figma 114:3014, flowchart "Getting Started").
// The three chips fill the field; Next stays disabled until the name is real.

export function NamePlanScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  // The plan count is a database read → effect, never render (compiler rule).
  const [existingPlans, setExistingPlans] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setExistingPlans(countPlans()), 0);
    return () => clearTimeout(id);
  }, []);

  const numbered = numberedPlanName(existingPlans);
  const suggestions = [
    { label: EXAMPLE_NAME, pick: () => EXAMPLE_NAME },
    { label: numbered, pick: () => numbered },
    { label: 'Surprise me', pick: () => surprisePlanName(name, Math.random()) },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TopBar
        left={<ArrowLeft color={color.text.primary} size={24} />}
        onPressLeft={() => router.back()}
        title="New Plan • Home"
      />
      <View style={styles.body}>
        <View style={styles.titleBlock}>
          <Text style={styles.h1}>Name{'\n'}this Plan</Text>
        </View>
        <View style={styles.form}>
          <Input
            label="Plan Name"
            maxLength={40}
            onChangeText={setName}
            placeholder="Something Memorable..."
            value={name}
          />
          <View style={styles.chips}>
            {suggestions.map((s) => (
              <Chip
                key={s.label}
                label={s.label}
                onPress={() => setName(s.pick())}
                selected={s.label !== 'Surprise me' && name === s.label}
                size="large"
                variant="outline"
              />
            ))}
          </View>
        </View>
      </View>
      <View style={styles.bottomBar}>
        <Button
          disabled={!isValidPlanName(name)}
          onPress={() =>
            router.push({ pathname: '/plan/new/strategy', params: { name: name.trim() } })
          }
          title="Next"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  // Figma 114:3016: pt24, gap 48 between title and form.
  body: { flex: 1, paddingTop: 24, gap: 48 },
  titleBlock: { paddingHorizontal: 24, paddingVertical: 4 },
  h1: { ...type.h1, color: color.text.primary },
  form: { paddingHorizontal: 24, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bottomBar: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
});
