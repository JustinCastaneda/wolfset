import { StyleSheet, View } from 'react-native';

import { RadioCard } from '@/components/RadioCard';
import { EQUIPMENT, type EquipmentId } from '@/lib/db/profile-store';
import { SettingsSubscreen } from './SettingsSubscreen';
import { useProfile } from './useProfile';

// Equipment (Figma 433:22674): a checklist of what the gym has — any number selected.
// Nothing reads it yet; the catalog filter (data-model §2 Exercise.equipment) will.

export function EquipmentScreen() {
  const [profile, update] = useProfile();
  const toggle = (id: EquipmentId) => {
    if (!profile) return;
    const has = profile.equipment.includes(id);
    update({
      equipment: has ? profile.equipment.filter((e) => e !== id) : [...profile.equipment, id],
    });
  };
  return (
    <SettingsSubscreen barTitle="Equipment" title="Equipment">
      <View style={styles.list}>
        {EQUIPMENT.map((item) => (
          <RadioCard
            checkbox
            key={item.id}
            onPress={() => toggle(item.id)}
            selected={profile?.equipment.includes(item.id) ?? false}
            title={item.label}
          />
        ))}
      </View>
    </SettingsSubscreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
});
