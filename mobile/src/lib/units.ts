// Unit rules for the profile's bodyweight and height (Settings → Personal Info,
// Figma 433:23386). Storage is canonical — pounds and centimetres — and only the
// display converts, so a unit switch never rewrites stored numbers. Pure — tested.

export type Unit = 'lb' | 'kg';

const LB_PER_KG = 2.2046;
const CM_PER_INCH = 2.54;

/** Bodyweight for display in the chosen unit, to one decimal. */
export function displayWeight(lb: number, unit: Unit): number {
  return unit === 'lb' ? round1(lb) : round1(lb / LB_PER_KG);
}

/** One stepper tap on the weight: a pound, or half a kilo, applied in the stored unit. */
export function stepWeight(lb: number, unit: Unit, direction: 1 | -1): number {
  const stepLb = unit === 'lb' ? 1 : 0.5 * LB_PER_KG;
  return Math.max(0, round1(lb + direction * stepLb));
}

/** A weight typed in the chosen unit, back to stored pounds. */
export function storedWeight(value: number, unit: Unit): number {
  return round1(unit === 'lb' ? value : value * LB_PER_KG);
}

/** Height for display: "5’9”" in imperial, "175 cm" in metric. */
export function displayHeight(cm: number, unit: Unit): string {
  if (unit === 'kg') return `${Math.round(cm)} cm`;
  const inches = Math.round(cm / CM_PER_INCH);
  return `${Math.floor(inches / 12)}’${inches % 12}”`;
}

/** One stepper tap on the height: an inch, or a centimetre. */
export function stepHeight(cm: number, unit: Unit, direction: 1 | -1): number {
  const stepCm = unit === 'lb' ? CM_PER_INCH : 1;
  return Math.max(0, round1(cm + direction * stepCm));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
