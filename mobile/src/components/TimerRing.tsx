import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { color } from '@/theme/tokens';

// The rest-timer ring — the differentiator UI (plan 3c). Measured from the "Spinner"
// on the Post Set Timer screen (node 25:300): 328×328, 8.2px stroke, track in the
// raised gray, progress sweeping counter-clockwise from 12 o'clock with round caps.
// Ring length is time remaining; ring color is the heart-rate zone (handoff brief §02).

type TimerRingProps = {
  /** 0 → done, 1 → full ring. Fraction of rest time remaining. */
  progress: number;
  /** Heart-rate zone → ring color: resting red · approaching yellow · ready green. */
  zone: 'resting' | 'approaching' | 'ready';
  size?: number;
  children?: React.ReactNode;
};

const STROKE = 8.2;

export function TimerRing({ progress, zone, size = 328, children }: TimerRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color.bg.raised}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color.timer[zone]}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          // Rotate so the arc starts at 12 o'clock; scaleX(-1) mirrors it counter-clockwise,
          // matching the file's sweep direction.
          transform={`scale(-1 1) translate(${-size} 0) rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
