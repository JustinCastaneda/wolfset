import { ConfirmSheet } from '@/components/ConfirmSheet';

// End Workout's question, from the workout overview. Copy follows the watch End Workout
// Confirmation (164:4371), with "miss" corrected to failure semantics per the data model.

export function ConfirmEndSheet({
  visible,
  setsDone,
  setsTotal,
  onCancel,
  onEnd,
}: {
  visible: boolean;
  setsDone: number;
  setsTotal: number;
  onCancel: () => void;
  onEnd: () => void;
}) {
  const early = setsDone < setsTotal;
  return (
    <ConfirmSheet
      confirmLabel="End"
      message={
        early
          ? `Only ${setsDone} of ${setsTotal} sets done. Unfinished lifts count as failures and may trigger a deload.`
          : 'All sets done. Nice work.'
      }
      onCancel={onCancel}
      onConfirm={onEnd}
      title="End Workout?"
      visible={visible}
    />
  );
}
