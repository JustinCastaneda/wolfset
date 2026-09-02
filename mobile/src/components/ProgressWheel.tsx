import Svg, { Circle } from 'react-native-svg';

import { color } from '@/theme/tokens';

// The mini progress wheel on in-progress exercise rows with more than 4 sets
// (Workout Summary / Progress / More than 4 sets, node 433:22351). Brand arc on the
// raised track, clockwise from 12.

export function ProgressWheel({
  progress,
  size = 28,
  stroke = 5,
}: {
  /** 0..1 — fraction of sets logged. */
  progress: number;
  size?: number;
  stroke?: number;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <Svg height={size} width={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke={color.bg.raised}
        strokeWidth={stroke}
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke={color.brand}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        strokeLinecap="round"
        strokeWidth={stroke}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
