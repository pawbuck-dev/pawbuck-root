/** @deprecated Global gate replaced by country cohort; kept for tests referencing legacy threshold. */
export const WEEKLY_CHALLENGE_MIN_APP_USERS = 300;

/** Weekly challenge UI when enough pet owners share the selected pet's country (pets.country). */
export const WEEKLY_CHALLENGE_MIN_COUNTRY_USERS = 50;

/** Ignore GPS jumps shorter than this (meters) to reduce noise. */
export const PAWTHON_MIN_SEGMENT_METERS = 4;

/** Max GPS samples stored per walk (jsonb size guard). */
export const PAWTHON_MAX_POINTS_PER_SESSION = 400;

/** Minimum total distance to count a finished walk (meters). */
export const PAWTHON_MIN_WALK_METERS = 15;

/** Minimum distance in a calendar day to count toward streak (meters). */
export const PAWTHON_STREAK_DAY_MIN_METERS = 80;
