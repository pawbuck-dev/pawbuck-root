import {
  FOOD_MOTIVATIONS,
  MAX_STRESS_TRIGGERS,
  SLEEP_RESTFULNESS_OPTIONS,
  SOCIAL_DISPOSITIONS,
  VOCALIZATION_LEVELS,
  type FoodMotivation,
  type SleepRestfulness,
  type SocialDisposition,
  type VocalizationLevel,
} from "@/types/behaviorBaseline";

export type BaselineDimensionId =
  | "energy"
  | "social"
  | "food"
  | "sleep"
  | "vocalization"
  | "reactivity";

export type BaselineQuestionUi =
  | { kind: "scale_1_5"; min: 1; max: 5; minLabel: string; maxLabel: string }
  | {
      kind: "single_select";
      options: ReadonlyArray<{ value: string; label: string; description?: string }>;
    }
  | {
      kind: "multi_select";
      options: ReadonlyArray<{ value: string; label: string }>;
      maxSelections: number;
    }
  | {
      kind: "compound_sleep";
      restfulnessOptions: ReadonlyArray<{ value: SleepRestfulness; label: string }>;
    };

export interface BaselineQuestion {
  dimensionId: BaselineDimensionId;
  prompt: string;
  helperText?: string;
  ui: BaselineQuestionUi;
}

const SOCIAL_OPTIONS: Record<SocialDisposition, string> = {
  social_butterfly: "Social butterfly",
  indifferent: "Indifferent",
  selective: "Selective",
};

const FOOD_OPTIONS: Record<FoodMotivation, string> = {
  high: "High — would do anything for food",
  normal: "Normal — eats well at meals",
  finicky: "Finicky — picky or grazes",
};

const VOCAL_OPTIONS: Record<VocalizationLevel, string> = {
  quiet: "Quiet",
  occasional_alerts: "Occasional alerts",
  very_talkative: "Very talkative",
};

const SLEEP_RESTFULNESS_LABELS: Record<SleepRestfulness, string> = {
  restful: "Restful — settles deeply",
  restless: "Restless — twitches or wakes",
  mixed: "Mixed — depends on the day",
};

/**
 * Built-in suggestions for stress triggers (top-3 mood changers). The UI caps
 * selection to {@link MAX_STRESS_TRIGGERS} which mirrors the DB CHECK.
 */
const STRESS_TRIGGER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "thunderstorms", label: "Thunderstorms" },
  { value: "fireworks", label: "Fireworks" },
  { value: "vacuum", label: "Vacuum / loud appliances" },
  { value: "vet_visits", label: "Vet visits" },
  { value: "car_rides", label: "Car rides" },
  { value: "strangers", label: "Strangers / visitors" },
  { value: "other_dogs", label: "Other dogs" },
  { value: "other_cats", label: "Other cats / animals" },
  { value: "alone_time", label: "Being left alone" },
  { value: "schedule_changes", label: "Schedule changes" },
  { value: "kids", label: "Young children" },
  { value: "loud_noises", label: "Other loud noises" },
];

/**
 * Pure (no I/O) generator that builds the six-question baseline assessment for
 * a given pet. The wording is interpolated with the pet's name so the screen
 * reads conversationally; ordering and `dimensionId` values are stable so the
 * UI / persistence layers can map answers back to columns deterministically.
 */
export function generateBaselineAssessment(input: {
  petName: string;
}): BaselineQuestion[] {
  const name = (input.petName || "your pet").trim() || "your pet";

  return [
    {
      dimensionId: "energy",
      prompt: `What's ${name}'s usual cruising speed?`,
      helperText: "1 = couch potato, 5 = always on the move.",
      ui: {
        kind: "scale_1_5",
        min: 1,
        max: 5,
        minLabel: "Couch potato",
        maxLabel: "Always on the move",
      },
    },
    {
      dimensionId: "social",
      prompt: `How does ${name} usually feel about people and other pets?`,
      ui: {
        kind: "single_select",
        options: SOCIAL_DISPOSITIONS.map((value) => ({
          value,
          label: SOCIAL_OPTIONS[value],
        })),
      },
    },
    {
      dimensionId: "food",
      prompt: `What's ${name}'s dietary drive on a normal day?`,
      helperText:
        "Helps Milo notice when skipped meals or sudden hunger differ from usual.",
      ui: {
        kind: "single_select",
        options: FOOD_MOTIVATIONS.map((value) => ({
          value,
          label: FOOD_OPTIONS[value],
        })),
      },
    },
    {
      dimensionId: "sleep",
      prompt: `Tell us about ${name}'s deep sleep — about how many hours, and where do they feel safest?`,
      helperText: "Approximate is fine; you can leave hours blank if unsure.",
      ui: {
        kind: "compound_sleep",
        restfulnessOptions: SLEEP_RESTFULNESS_OPTIONS.map((value) => ({
          value,
          label: SLEEP_RESTFULNESS_LABELS[value],
        })),
      },
    },
    {
      dimensionId: "vocalization",
      prompt: `How vocal is ${name} on a normal day?`,
      ui: {
        kind: "single_select",
        options: VOCALIZATION_LEVELS.map((value) => ({
          value,
          label: VOCAL_OPTIONS[value],
        })),
      },
    },
    {
      dimensionId: "reactivity",
      prompt: `What are ${name}'s top 3 mood changers — things that reliably stress them out?`,
      helperText: `Pick up to ${MAX_STRESS_TRIGGERS}.`,
      ui: {
        kind: "multi_select",
        options: STRESS_TRIGGER_OPTIONS,
        maxSelections: MAX_STRESS_TRIGGERS,
      },
    },
  ];
}

export const BASELINE_DIMENSION_ORDER: ReadonlyArray<BaselineDimensionId> = [
  "energy",
  "social",
  "food",
  "sleep",
  "vocalization",
  "reactivity",
];
