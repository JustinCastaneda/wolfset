import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ListItem } from '@/components/ListItem';
import { TopBar } from '@/components/TopBar';
import { formatDiary, loadLatestDiary } from '@/lib/db/session-log';
import { color, type } from '@/theme/tokens';

// Settings (Figma 433:22471): five rows into the subscreens, the wolf mark faded behind
// them. Exercise Data (433:23207 — stat tiles, trend charts, export) is a unit of its
// own, so its row waits, drawn but not pressable. Below the rows, the version; tapping
// it reveals the Developer Menu (Justin's 2026-09-04 frame) — the Design Kit, the
// workout diary, and whatever tooling comes later. It was `__DEV__`-only; since the
// diary (2026-09-05) it opens in every build, because the build that goes to the gym
// is a release build (no Metro) and that is the workout worth reading. The frame's
// "never on production" comes back as gating by account email (Phase 5), when there is
// a production.

/** Every build, until Phase 5 gates the menu by account (see above). */
const DEVELOPER_MENU = true;

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
  const [developerMenu, setDeveloperMenu] = useState(false);
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* The muted mark (550:19079): 405px, centred, a little below the middle. */}
      <Image
        contentFit="contain"
        pointerEvents="none"
        source={require('../../../assets/brand/wolfset-watermark-logo.svg')}
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
              chevron
              key={row.title}
              onPress={row.href ? () => router.push(row.href) : undefined}
              title={row.title}
            />
          ))}
        </View>
        {DEVELOPER_MENU && developerMenu && (
          <View style={styles.developer}>
            <Text style={styles.developerTitle}>Developer Menu</Text>
            <Button
              onPress={() => router.push('/design-kit')}
              title="Design Kit"
              variant="outline"
            />
            <Button onPress={shareWorkoutDiary} title="Share workout diary" variant="outline" />
          </View>
        )}
        <Pressable
          accessibilityRole={DEVELOPER_MENU ? 'button' : undefined}
          onPress={DEVELOPER_MENU ? () => setDeveloperMenu((open) => !open) : undefined}
          style={styles.version}
        >
          <Text style={styles.versionText}>Version {Constants.expoConfig?.version ?? '—'}</Text>
        </Pressable>
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
  // The frame's panel: raised r12 with the border, pad 24, title over the buttons.
  developer: {
    marginHorizontal: 24,
    padding: 24,
    gap: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.bg.raised,
  },
  developerTitle: { ...type.label, color: color.text.secondary },
  version: { alignSelf: 'center', padding: 12 },
  versionText: { ...type.caption, color: color.text.secondary },
});

/** The newest workout's diary (lib/db/session-log.ts) out through the share sheet, as
 *  text — a real gym session, read afterwards. */
function shareWorkoutDiary() {
  const diary = loadLatestDiary();
  if (!diary) {
    Alert.alert('No workout yet', 'The diary starts with the first workout.');
    return;
  }
  void Share.share({
    title: 'WOLFSET workout diary',
    message: formatDiary(diary.sessionStartedAt, diary.entries),
  });
}
