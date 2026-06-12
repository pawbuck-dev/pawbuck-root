/** Daily habit ring variants — stable colors (intake vs output groups). */
export type HabitRingVariant = "food" | "water" | "poop" | "pee";

/** Progress arc colors (Apple Activity–style: one hue per metric). */
export const HABIT_RING_STROKE: Record<HabitRingVariant, string> = {
  food: "#FF9500",
  water: "#32ADE6",
  poop: "#C4A574",
  pee: "#5E5CE6",
};

/** Ring fill 0–100; counts above target still show a full ring. */
export function habitRingPercent(count: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((Math.min(count, target) / target) * 100);
}
