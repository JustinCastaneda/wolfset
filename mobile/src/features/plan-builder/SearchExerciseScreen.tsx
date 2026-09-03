import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronRight, Dumbbell } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Input } from '@/components/Input';
import { ListItem } from '@/components/ListItem';
import { TopBar } from '@/components/TopBar';
import { loadExercises, matchesQuery, type Exercise } from '@/lib/db/exercise-store';
import { loadDay, type BuilderDay } from '@/lib/db/plan-store';
import { color, type } from '@/theme/tokens';
import { searchCopy } from './reorder';

// Search Exercise in the plan flow (Figma 101:814, "What's the first lift?"): title,
// the search field, the catalog. The whole row is the tap target, with a chevron —
// the Go button belongs to Freestyle (Justin, 2026-09-02). ⚠️ Still missing from the
// frame: the WolfSet illustrations (open decision #10 — a lucide dumbbell stands in)
// and the filter button + drawer (403:13713).

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
  const dayName = day?.dayName ?? 'Day 1';
  const copy = searchCopy(dayName, day?.exercises.length ?? 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TopBar
        left={<ArrowLeft color={color.text.primary} size={24} />}
        onPressLeft={() => router.back()}
        title={`${dayName} • Add Exercise`}
      />
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Text style={styles.h1}>{copy.title}</Text>
              <Text style={styles.subtitle}>{copy.subtitle}</Text>
            </View>
            <View style={styles.search}>
              <Input onChangeText={setQuery} placeholder="Search Exercises..." value={query} />
            </View>
          </View>
        }
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
            onPress={() =>
              router.push({
                pathname: '/plan/day/[dayId]/add/[exerciseId]',
                params: { dayId: dayId ?? '', exerciseId: item.id },
              })
            }
            title={item.name}
            trailing={
              <View style={styles.chevron}>
                <ChevronRight color={color.text.primary} size={24} />
              </View>
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
  // Figma 101:815: pt24; title block px24 py4 gap 8; the field in a 24/12 frame.
  header: { paddingTop: 24, gap: 16 },
  titleBlock: { paddingHorizontal: 24, paddingVertical: 4, gap: 8 },
  h1: { ...type.h1, color: color.text.primary },
  subtitle: { fontFamily: 'Geom', fontSize: 20, fontWeight: '400', color: color.text.secondary },
  search: { paddingHorizontal: 24, paddingVertical: 12 },
  // The 64px illustration slot (443:7337) until the icon set lands.
  icon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  // The row's trailing ghost button slot (443:7341): 48px.
  chevron: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
