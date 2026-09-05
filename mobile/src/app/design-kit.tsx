import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  History,
  ListTree,
  Settings2,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ButtonGroup } from '@/components/ButtonGroup';
import { Chip } from '@/components/Chip';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { CaptionLead, ExerciseRow, RowNumber } from '@/components/ExerciseRow';
import { IconCard } from '@/components/IconCard';
import { Input } from '@/components/Input';
import { Keypad } from '@/components/Keypad';
import { ListItem } from '@/components/ListItem';
import { RadioCard } from '@/components/RadioCard';
import { SegmentedButtons } from '@/components/SegmentedButtons';
import { SegmentedProgress } from '@/components/SegmentedProgress';
import { Stepper } from '@/components/Stepper';
import { TimerRing } from '@/components/TimerRing';
import { TopBar } from '@/components/TopBar';
import { WeekStrip } from '@/components/WeekStrip';
import { WeightReadout } from '@/components/WeightReadout';
import { suggestedWeek } from '@/lib/plan-week';
import { color, palette, type } from '@/theme/tokens';
import { WolfsetHr } from '@modules/wolfset-hr';
import {
  onWatchAction,
  showOnWatch,
  startWatch,
  stopWatch,
  type WatchReach,
} from '@/features/hr/watch-control';
import {
  armRestTimer,
  disarmRestTimer,
  ensureRestPermissions,
} from '@/features/set-loop/native-rest';
import type { WatchView } from '@/features/set-loop/watch-view';

// The Design Kit (plan 3d): every component and variant on one screen, so Justin can hold
// the phone next to Figma and compare. Renders nothing outside dev — Metro strips the
// __DEV__ branch from production bundles, so the kit's content tree-shakes away.

export default function DesignKit() {
  const insets = useSafeAreaInsets();
  const [watchReach, setWatchReach] = useState<WatchReach | null>(null);
  const [watchTap, setWatchTap] = useState<string | null>(null);
  useEffect(() => onWatchAction((action) => setWatchTap(`${action.type} ${action.reps}`)), []);
  if (!__DEV__) return null;
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* The way out (Justin, 2026-09-04: #61 left no way to leave the kit). Back to the
          Developer Menu it came from; a deep link with nothing behind it lands on home. */}
      <TopBar
        left={<ArrowLeft color={color.text.primary} size={24} />}
        onPressLeft={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        title="Settings • Developer Menu"
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.h1}>Design Kit</Text>

        {/* Dev seam for the watch pipeline: pushes a sample through the same native path a
          watch message takes, so the timer's HR states can be exercised without a watch.
          A session left open underneath (push this route from the timer) receives it. */}
        <Text style={styles.section}>
          Heart rate — inject a sample {WolfsetHr ? '' : '(native module not in this build)'}
        </Text>
        <View style={styles.chipRow}>
          {[150, 130, 110].map((bpm) => (
            <Button
              disabled={!WolfsetHr}
              key={bpm}
              onPress={() => WolfsetHr?.debugInjectSample(bpm)}
              size="small"
              title={`${bpm} bpm`}
              variant="secondary"
            />
          ))}
        </View>

        {/* Phone → watch: the same calls the session makes on mount and on finish. Handy for
          a hardware check without running a workout. */}
        <Text style={styles.section}>
          Watch — start / stop the stream{watchReach ? ` (${watchReach})` : ''}
        </Text>
        <View style={styles.chipRow}>
          <Button
            disabled={!WolfsetHr}
            onPress={() => void startWatch().then(setWatchReach)}
            size="small"
            title="Start watch"
            variant="secondary"
          />
          <Button
            disabled={!WolfsetHr}
            onPress={() => void stopWatch().then(setWatchReach)}
            size="small"
            title="Stop watch"
            variant="secondary"
          />
        </View>

        {/* Phone → watch → phone: put a sample set or rest on the watch — what the session
          publishes on every change — then tap Log or Continue there; the tap shows up here.
          The whole wrist loop, without a workout. */}
        <Text style={styles.section}>
          Watch — show a set{watchTap ? ` · last tap: ${watchTap}` : ''}
        </Text>
        <View style={styles.chipRow}>
          <Button
            disabled={!WolfsetHr}
            onPress={() => showOnWatch(JSON.stringify(KIT_SET))}
            size="small"
            title="Set 135×5"
            variant="secondary"
          />
          <Button
            disabled={!WolfsetHr}
            onPress={() =>
              showOnWatch(
                JSON.stringify({
                  ...KIT_SET,
                  screen: 'rest',
                  setsDone: 1,
                  restEndsAt: Date.now() + 90_000,
                }),
              )
            }
            size="small"
            title="Rest 90 s"
            variant="secondary"
          />
          <Button
            disabled={!WolfsetHr}
            onPress={() => showOnWatch(JSON.stringify({ screen: 'none' }))}
            size="small"
            title="Clear"
            variant="secondary"
          />
        </View>

        {/* The native rest timer on its own: arm a short rest, lock the screen, wait for the
          buzz and the ding at zero — the only alert. */}
        <Text style={styles.section}>Rest timer — native, 20 s</Text>
        <View style={styles.chipRow}>
          <Button
            disabled={!WolfsetHr}
            onPress={() =>
              void ensureRestPermissions().then((ok) => {
                if (ok) armRestTimer(Date.now() + 20_000);
              })
            }
            size="small"
            title="Arm 20 s"
            variant="secondary"
          />
          <Button
            disabled={!WolfsetHr}
            onPress={disarmRestTimer}
            size="small"
            title="Disarm"
            variant="secondary"
          />
        </View>

        <Text style={styles.section}>Button — Solid · Outline · Ghost · Secondary</Text>
        {(['solid', 'outline', 'ghost', 'secondary'] as const).map((variant) => (
          <View key={variant} style={styles.group}>
            <Button title={`${variant} large`} variant={variant} size="large" />
            <Button title={`${variant} small`} variant={variant} size="small" />
            <Button title="disabled" variant={variant} size="small" disabled />
          </View>
        ))}
        <Text style={styles.caption}>Icon-only — the hub row’s arrow (34:1520)</Text>
        <View style={styles.chipRow}>
          <Button
            accessibilityLabel="Start"
            leftIcon={<ArrowRight color={color.text.onButton} size={24} />}
            size="small"
          />
          <Button
            accessibilityLabel="Start"
            leftIcon={<ArrowRight color={color.text.onButton} size={24} />}
            size="small"
            variant="secondary"
          />
          <Button
            accessibilityLabel="Start"
            disabled
            leftIcon={<ArrowRight color={color.text.disabled} size={24} />}
            size="small"
            variant="secondary"
          />
        </View>

        <Text style={styles.section}>Chip — Brand · Muted · Outline (idle / selected)</Text>
        {(['brand', 'muted', 'outline'] as const).map((variant) => (
          <View key={variant} style={styles.chipRow}>
            <Chip label={variant} variant={variant} size="small" />
            <Chip label={variant} variant={variant} size="small" selected />
            <Chip label={variant} variant={variant} size="large" />
            <Chip label={variant} variant={variant} size="large" selected />
          </View>
        ))}
        <Text style={styles.caption}>Toggleable — tap to select, hold to see the press shade</Text>
        <ToggleChipsDemo />

        <Text style={styles.section}>Radio Card — default · selected (tap to move)</Text>
        <RadioCardDemo />
        <Text style={styles.caption}>Checklist — the Settings look, any number checked</Text>
        <ChecklistDemo />

        <Text style={styles.section}>Segmented Buttons — the unit toggle</Text>
        <SegmentedDemo />

        <Text style={styles.section}>Stepper — Personal Info’s weight</Text>
        <StepperDemo />

        <Text style={styles.section}>
          Button Group — 1 · 3 · 5 · 10 · custom (pencil opens a keypad)
        </Text>
        <ButtonGroupDemo />

        <Text style={styles.section}>List Item — leading · trailing · accent caption · tag</Text>
        <ListItem
          caption="Barbell • Legs, Back"
          title="Deadlift"
          trailing={<Button size="small" title="Go" />}
        />
        <ListItem
          caption="Squat • Overhead Press • Deadlift"
          title="Workout A"
          titleTag="Up Next"
          trailing={
            <Button
              accessibilityLabel="Start Workout A"
              leftIcon={<ArrowRight color={color.text.onButton} size={24} />}
              size="small"
            />
          }
        />
        <ListItem caption="Reps First • Plan Default" title="Progression" />
        <ListItem
          caption="1:30 Rest"
          captionAccent="Progression Override"
          title="Bulgarian Split Squat"
        />
        <ListItem
          caption="Press me: the chevron turns brand"
          chevron
          onPress={() => {}}
          title="Equipment"
        />
        <ListItem caption="Goes nowhere yet" chevron title="Exercise Data" />

        <Text style={styles.section}>Exercise Row — defaults · progression override · current</Text>
        <ExerciseRow
          caption={
            <>
              <CaptionLead overrides={false} /> • 1:30 Rest
            </>
          }
          indicator={<RowNumber n={1} />}
          rx="5x5"
          title="Bulgarian Split Squat"
          weight={85}
        />
        <ExerciseRow
          caption={
            <>
              <CaptionLead overrides /> • 1:30 Rest
            </>
          }
          indicator={<RowNumber n={2} />}
          rx="4x10"
          title="Goblet Squat"
          weight={50}
        />
        <ExerciseRow
          caption={
            <>
              <CaptionLead overrides={false} /> • <Text style={styles.brand}>Up Next</Text>
            </>
          }
          current
          indicator={<RowNumber n={3} />}
          onPress={() => {}}
          rx="5x6"
          title="Front Squat"
          weight={90}
        />

        <Text style={styles.section}>Confirm sheet — the drawer every workout-ender opens</Text>
        <ConfirmSheetDemo />

        <Text style={styles.section}>Input — default · filled · error · required + count</Text>
        <View style={styles.group}>
          <Input label="Label" placeholder="Placeholder Text" />
          <Input label="Email" value="justin@brethrenstudios.com" onChangeText={() => {}} />
          <Input label="Weight" required error helperText="Enter a weight" placeholder="0" />
          <CountedInputDemo />
        </View>

        <Text style={styles.section}>Top Bar — mark · centered · left-aligned (lucide chrome)</Text>
        <TopBar
          left={
            <Image
              contentFit="contain"
              source={require('../../assets/brand/wolfset-mark.svg')}
              style={styles.mark}
            />
          }
          right={<Settings2 color={color.text.primary} size={24} />}
          title=""
        />
        <TopBar
          left={<ListTree color={color.text.primary} size={24} />}
          right={<X color={color.text.primary} size={24} />}
          title="Plan A • Squat • 4/5"
        />
        <TopBar
          align="left"
          right={<Settings2 color={color.text.primary} size={24} />}
          title="Plan A • Squat • 4/5"
        />

        <Text style={styles.section}>Icon Card — enabled · disabled (the hub tiles)</Text>
        <View style={styles.chipRow}>
          <IconCard
            icon={<BookOpen color={color.text.primary} size={32} />}
            label={'Edit Current\nMesoCycle'}
            onPress={() => {}}
          />
          <IconCard
            disabled
            icon={<History color={color.text.disabled} size={32} />}
            label={'Workout\nHistory'}
          />
        </View>

        <Text style={styles.section}>Week strip — two days · none</Text>
        <View style={styles.kitWeek}>
          <WeekStrip week={suggestedWeek(2)} />
          <WeekStrip week={suggestedWeek(0)} />
        </View>

        <Text style={styles.section}>Timer ring — resting · approaching · ready</Text>
        <View style={styles.chipRow}>
          <TimerRing progress={0.85} size={100} zone="resting" />
          <TimerRing progress={0.45} size={100} zone="approaching" />
          <TimerRing progress={0.12} size={100} zone="ready" />
        </View>

        <Text style={styles.section}>Sets bar — 5 done, 1 current, 2 up</Text>
        <SegmentedProgress done={5} total={8} />

        <Text style={styles.section}>Weight readout — up · down · unchanged</Text>
        <WeightReadout unit="Lbs" value={245} was={200} />
        <WeightReadout unit="Lbs" value={195} was={205} />
        <WeightReadout unit="Lbs" value={135} />

        <Text style={styles.section}>Keypad</Text>
        <Keypad onKey={() => {}} />

        <Text style={styles.section}>
          Brand — mark · watermark logo · slashes (opacity baked in)
        </Text>
        <View style={styles.chipRow}>
          <Image
            contentFit="contain"
            source={require('../../assets/brand/wolfset-mark.svg')}
            style={styles.mark}
          />
          <Image
            contentFit="contain"
            source={require('../../assets/brand/wolfset-watermark-logo.svg')}
            style={styles.watermark}
          />
          <Image
            contentFit="contain"
            source={require('../../assets/brand/wolfset-watermark-slashes.svg')}
            style={styles.watermark}
          />
        </View>

        <Text style={styles.section}>Type scale — Geom</Text>
        {Object.entries(type).map(([name, style]) => (
          <Text key={name} numberOfLines={1} style={[style, styles.sample]}>
            {name} {style.fontSize}px
          </Text>
        ))}

        <Text style={styles.section}>Palette</Text>
        {Object.entries(palette).map(([scale, steps]) => (
          <View key={scale} style={styles.chipRow}>
            {Object.entries(steps).map(([step, hex]) => (
              <View key={step} style={[styles.swatch, { backgroundColor: hex }]} />
            ))}
            <Text style={styles.swatchLabel}>{scale}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// The counter needs a controlled input — value + onChangeText — which screens will
// always have. The kit fakes the screen's state here.
function ConfirmSheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onPress={() => setOpen(true)} size="small" title="Open" variant="secondary" />
      <ConfirmSheet
        confirmLabel="End & Start"
        message="Workout B is still in progress. Starting Workout A ends it now, and every lift you didn't finish counts as a failure."
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        title="End Workout B?"
        visible={open}
      />
    </>
  );
}

function CountedInputDemo() {
  const [name, setName] = useState('');
  return (
    <Input
      helperText=" "
      label="Plan name"
      maxLength={100}
      onChangeText={setName}
      placeholder="Winter Bulk"
      showCount
      value={name}
    />
  );
}

function ToggleChipsDemo() {
  const [on, setOn] = useState<Record<string, boolean>>({});
  return (
    <View style={styles.chipRow}>
      {(['brand', 'muted', 'outline'] as const).map((variant) => (
        <Chip
          key={variant}
          label={variant}
          onPress={() => setOn((prev) => ({ ...prev, [variant]: !prev[variant] }))}
          selected={!!on[variant]}
          size="large"
          variant={variant}
        />
      ))}
    </View>
  );
}

function ButtonGroupDemo() {
  const [sets, setSets] = useState(5);
  return <ButtonGroup label="Sets" onChange={setSets} options={[1, 3, 5, 10]} value={sets} />;
}

function ChecklistDemo() {
  const [checked, setChecked] = useState<Record<string, boolean>>({ Dumbbells: true });
  return (
    <View style={styles.group}>
      {['Dumbbells', 'Barbells'].map((item) => (
        <RadioCard
          checkbox
          key={item}
          onPress={() => setChecked((prev) => ({ ...prev, [item]: !prev[item] }))}
          selected={!!checked[item]}
          title={item}
        />
      ))}
    </View>
  );
}

function SegmentedDemo() {
  const [unit, setUnit] = useState<'kg' | 'lb'>('lb');
  return (
    <SegmentedButtons
      label="Unit"
      onChange={setUnit}
      options={[
        { value: 'kg', label: 'Kgs' },
        { value: 'lb', label: 'Lbs' },
      ]}
      value={unit}
    />
  );
}

function StepperDemo() {
  const [weight, setWeight] = useState(165);
  return (
    <Stepper
      label="Your Weight (Lbs)"
      onDecrement={() => setWeight((w) => w - 1)}
      onIncrement={() => setWeight((w) => w + 1)}
      value={String(weight)}
    />
  );
}

function RadioCardDemo() {
  const [picked, setPicked] = useState<'steady' | 'by-feel'>('steady');
  return (
    <View style={styles.group}>
      <RadioCard
        description="Hit all of your reps and the next set will add 5lbs. Miss twice, and we’ll drop 10%"
        onPress={() => setPicked('steady')}
        selected={picked === 'steady'}
        title="Steady"
      />
      <RadioCard
        description="Decide after each set. We’ll make suggestions but the choice is up to you"
        onPress={() => setPicked('by-feel')}
        selected={picked === 'by-feel'}
        title="By Feel"
      />
    </View>
  );
}

/** The set the kit shows on the watch — the first set of a 5×5 Squat. */
const KIT_SET: WatchView = {
  screen: 'set',
  exerciseNo: 1,
  exercise: 'Squat',
  setsDone: 0,
  setsTotal: 5,
  setNo: 1,
  dayDone: 0,
  dayTotal: 5,
  canUnskip: false,
  dayOrder: 0,
  canChange: false,
  days: [],
  weight: 135,
  unit: 'Lbs',
  reps: 5,
  restEndsAt: 0,
  restSeconds: 90,
  recovered: false,
  recoveredBelowBpm: 120,
  approachingUpToBpm: 140,
  idleEndsAt: 0,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  h1: { ...type.h1, color: color.text.primary },
  section: { ...type.label, color: color.text.secondary, marginTop: 16 },
  brand: { color: color.brand },
  caption: { ...type.caption, color: color.text.muted },
  group: { gap: 8 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // The strip pads its own 24 sides for a screen; the kit's 16 gutters take it back.
  kitWeek: { marginHorizontal: -8, gap: 12 },
  mark: { width: 36, height: 44 },
  watermark: { width: 140, height: 140 },
  sample: { color: color.text.primary },
  swatch: { width: 28, height: 28, borderRadius: 4 },
  swatchLabel: { ...type.caption, color: color.text.muted },
});
