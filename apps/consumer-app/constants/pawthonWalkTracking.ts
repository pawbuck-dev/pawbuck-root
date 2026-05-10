/** Warmup: do not record route until horizontal accuracy is at or below this (meters), or timeout. */
export const PAWTHON_WARMUP_TARGET_ACCURACY_M = 10;

/** Max time to wait for a good first fix before starting with a weak-GPS warning. */
export const PAWTHON_WARMUP_TIMEOUT_MS = 10_000;
