import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Dumbbell } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ListItem } from '@/components/ListItem';
import { TopBar } from '@/components/TopBar';
import { loadExercises, matchesQuery, type Exercise } from '@/lib/db/exercise-store';
import { loadDay, type BuilderDay } from '@/lib/db/plan-store';
import { color } from '@/theme/tokens';

// Search Exercise (Figma 384:11596; flowchart "What's the first lift?") — the catalog
// with a search field; Go opens Add Exercise Details for that lift. ⚠️ Two things the
// frame has that this doesn't yet: the WolfSet exercise illustrations (open decision
// #10 — a lucide dumbbell stands in) and the filter drawer (403:13713).

export function SearchExerciseScreen() {
  const insets = useSafeAreaInsets();
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [day, setDay] = useState<BuilderDay | null>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      setCatalog(loadExercises());
      setDay(dayId ? loadDay(dayId) : null);
    }, 0);
    return () => clearTimeout(id);
  }, [dayId]);

  const results = catalog.filter((e) => matchesQuery(e, query));
  const title = day ? `${day.planName} • ${day.dayName}` : 'Add Exercise';

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TopBar
        left={<ArrowLeft color={color.text.primary} size={24} />}
        onPressLeft={() => router.back()}
        title={title}
      />
      <View style={styles.search}>
        <Input onChangeText={setQuery} placeholder="Search Exercises..." value={query} />
      </View>
      <FlatList
        data={results}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <ListItem
            caption={`${LOAD_LABEL[item.loadType]} • ${item.muscles.join(', ')}`}
            leading={
              <View style={styles.icon}>
                <Dumbbell color={color.brand} size={32} />
              </View>
            }
            title={item.name}
            trailing={
              <Button
                onPress={() =>
                  router.push({
                    pathname: '/plan/day/[dayId]/add/[exerciseId]',
                    params: { dayId: dayId ?? '', exerciseId: item.id },
                  })
                }
                size="small"
                title="Go"
              />
            }
          />
        )}
      />
    </View>
  );
}

const LOAD_LABEL: Record<Exercise['loadType'], string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  cable: 'Cable',
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  // Figma 384:11598: the field sits in a 24/12 frame under the bar.
  search: { paddingHorizontal: 24, paddingVertical: 12 },
  // The 64px illustration slot (446:5141) until the icon set lands.
  icon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
});
