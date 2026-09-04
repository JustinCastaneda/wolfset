import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListItem } from '@/components/ListItem';
import { TopBar } from '@/components/TopBar';
import { color, type } from '@/theme/tokens';

// Settings (Figma 433:22471): five rows into the subscreens, the wolf mark faded behind
// them. Exercise Data (433:23207 — stat tiles, trend charts, export) is a unit of its
// own, so its row waits, drawn but not pressable.

const ROWS = [
  { title: 'Equipment', caption: 'What you have access to', href: '/settings/equipment' },
  {
    title: 'Unit & Scale',
    caption: 'Pounds or Metric • Weight Scale',
    href: '/settings/unit-scale',
  },
  { title: 'Exercise Data', caption: 'View & Export Data', href: null },
  {
    title: 'Personal Settings',
    caption: 'Weight • Height • Experience',
    href: '/settings/personal',
  },
  { title: 'Workout Goal', caption: 'Changes suggested workouts', href: '/settings/goal' },
] as const;

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* The muted mark (550:19079): 405px, centred, a little below the middle. */}
      <Image
        contentFit="contain"
        pointerEvents="none"
        source={require('../../../assets/brand/wolfset-mark-muted.svg')}
        style={styles.watermark}
      />
      <TopBar
        left={<ArrowLeft color={color.text.primary} size={24} />}
        onPressLeft={() => router.back()}
        title="Settings"
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.titleBlock}>
          <Text style={styles.h1}>Settings</Text>
        </View>
        <View>
          {ROWS.map((row) => (
            <ListItem
              caption={row.caption}
              key={row.title}
              onPress={row.href ? () => router.push(row.href) : undefined}
              title={row.title}
              trailing={
                <View style={styles.chevron}>
                  <ChevronRight
                    color={row.href ? color.text.primary : color.text.disabled}
                    size={24}
                  />
                </View>
              }
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  watermark: {
    position: 'absolute',
    width: 405,
    height: 405,
    alignSelf: 'center',
    top: '50%',
    marginTop: -405 / 2 + 32,
  },
  scroll: { paddingTop: 24, gap: 32 },
  titleBlock: { paddingHorizontal: 24 },
  h1: { ...type.h1, color: color.text.primary },
  // The frame's chevron sits in a 48px ghost button slot (433:22598).
  chevron: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
