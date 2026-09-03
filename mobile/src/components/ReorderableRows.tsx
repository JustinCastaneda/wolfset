import { GripVertical } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

import { color } from '@/theme/tokens';
import { dropIndex } from '@/features/plan-builder/reorder';

// Rows of one fixed height that can be dragged into a new order by their grip. Plain
// Animated + PanResponder — no gesture library — because the rows are uniform and the
// list short (a day's lifts). The dragged row follows the finger; the rows it passes
// slide out of its way; release commits through onMove. ⚠️ Undesigned: the grip is
// the affordance until Justin draws the edit state (Day Summary mock, 2026-09-02).

type ReorderableRowsProps<T> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  rowHeight: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  onMove: (from: number, to: number) => void;
  /** True while a drag is live — the parent ScrollView should stop scrolling. */
  onDragging?: (dragging: boolean) => void;
};

export function ReorderableRows<T>({
  items,
  keyOf,
  rowHeight,
  renderRow,
  onMove,
  onDragging,
}: ReorderableRowsProps<T>) {
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  // Created once (lazy state, not a ref read in render — compiler rule).
  const [dy] = useState(() => new Animated.Value(0));

  return (
    <View>
      {items.map((item, index) => {
        const isDragged = drag?.from === index;
        // Rows between the origin and the hovered slot slide one row toward the origin.
        let shift = 0;
        if (drag && !isDragged) {
          if (index > drag.from && index <= drag.over) shift = -rowHeight;
          if (index < drag.from && index >= drag.over) shift = rowHeight;
        }
        return (
          <Animated.View
            key={keyOf(item)}
            style={[
              styles.row,
              { height: rowHeight },
              isDragged
                ? { transform: [{ translateY: dy }], zIndex: 1, elevation: 1 }
                : { transform: [{ translateY: shift }] },
              isDragged && styles.rowDragged,
            ]}
          >
            <Grip
              onEnd={() => {
                const d = drag;
                setDrag(null);
                dy.setValue(0);
                onDragging?.(false);
                if (d && d.over !== d.from) onMove(d.from, d.over);
              }}
              onMove={(delta) => {
                dy.setValue(delta);
                const over = dropIndex(index, delta, rowHeight, items.length);
                setDrag((d) => (d && d.over === over ? d : { from: index, over }));
              }}
              onStart={() => {
                setDrag({ from: index, over: index });
                onDragging?.(true);
              }}
            />
            <View style={styles.content}>{renderRow(item, index)}</View>
          </Animated.View>
        );
      })}
    </View>
  );
}

function Grip({
  onStart,
  onMove,
  onEnd,
}: {
  onStart: () => void;
  onMove: (dy: number) => void;
  onEnd: () => void;
}) {
  // The responder is created once and reads the latest callbacks through a holder an
  // effect refreshes after every render (never touched during render — compiler rule).
  const [latest] = useState<GripCallbacks>(() => ({ onStart, onMove, onEnd }));
  useEffect(() => {
    Object.assign(latest, { onStart, onMove, onEnd });
  });
  const [pan] = useState(() => createPan(latest));
  // The responder lives on the grip only, so the rest of the row still taps.
  return (
    <View
      accessibilityLabel="Drag to reorder"
      accessibilityRole="adjustable"
      {...pan.panHandlers}
      style={styles.grip}
    >
      <GripVertical color={color.text.muted} size={24} />
    </View>
  );
}

type GripCallbacks = { onStart: () => void; onMove: (dy: number) => void; onEnd: () => void };

// Outside the component; the handlers run on touches and read the holder then.
function createPan(latest: GripCallbacks) {
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => latest.onStart(),
    onPanResponderMove: (_e, g) => latest.onMove(g.dy),
    onPanResponderRelease: () => latest.onEnd(),
    onPanResponderTerminate: () => latest.onEnd(),
  });
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: color.bg.base },
  rowDragged: { backgroundColor: color.bg.raised },
  grip: {
    width: 48,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  content: { flex: 1 },
});
