/** Compute next intake count after increment/decrement, clamped to [0, max]. */
export function nextIntakeCount(current: number, delta: number, max?: number): number {
  const next = current + delta;
  const floored = Math.max(0, next);
  if (max !== undefined && max >= 0) {
    return Math.min(floored, max);
  }
  return floored;
}
