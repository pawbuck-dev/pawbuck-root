/** Default daily walk goal (0.5 mi). */
export const PAWTHON_DEFAULT_GOAL_METERS = 805;

export const PAWTHON_GOAL_PRESETS = [
  { id: "short", label: "0.25 mi", meters: 402 },
  { id: "standard", label: "0.5 mi", meters: 805 },
  { id: "long", label: "1.0 mi", meters: 1609 },
] as const;

export const PAWTHON_GOAL_STORAGE_KEY = "@pawbuck/pawthon_daily_goal_meters_v1";
