import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TopBar } from '@/components/TopBar';
import { color, type } from '@/theme/tokens';

// The frame every Settings subscreen shares (433:22674, 433:22844, 433:23386,
// 433:27536): back arrow, "Settings • <name>" in the bar, the H1, then the screen's
// content 32 apart. Values save the moment they change — none of these has a Save button.

type SettingsSubscreenProps = {
  /** The bar's "Settings • …" tail. */
  barTitle: string;
  title: string;
  children: React.ReactNode;
};

export function SettingsSubscreen({ barTitle, title, children }: SettingsSubscreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TopBar
        left={<ArrowLeft color={color.text.primary} size={24} />}
        onPressLeft={() => router.back()}
        title={`Settings • ${barTitle}`}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.h1}>{title}</Text>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  scroll: { paddingTop: 24, paddingHorizontal: 24, gap: 32 },
  h1: { ...type.h1, color: color.text.primary },
});
