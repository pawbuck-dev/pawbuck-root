import {
  BASELINE_DIMENSION_ORDER,
  generateBaselineAssessment,
  type BaselineDimensionId,
} from "@/services/behaviorBaselineAssessment";
import {
  FOOD_MOTIVATIONS,
  MAX_STRESS_TRIGGERS,
  SLEEP_RESTFULNESS_OPTIONS,
  SOCIAL_DISPOSITIONS,
  VOCALIZATION_LEVELS,
} from "@/types/behaviorBaseline";

describe("generateBaselineAssessment", () => {
  it("returns six dimensions in the canonical order", () => {
    const qs = generateBaselineAssessment({ petName: "Milo" });
    expect(qs).toHaveLength(6);

    const ids = qs.map((q) => q.dimensionId);
    const expected: BaselineDimensionId[] = [
      "energy",
      "social",
      "food",
      "sleep",
      "vocalization",
      "reactivity",
    ];
    expect(ids).toEqual(expected);
    expect(ids).toEqual([...BASELINE_DIMENSION_ORDER]);
  });

  it("interpolates the pet name into every prompt", () => {
    const qs = generateBaselineAssessment({ petName: "Biscuit" });
    for (const q of qs) {
      expect(q.prompt).toContain("Biscuit");
    }
  });

  it("falls back to 'your pet' when name is empty or whitespace", () => {
    const empty = generateBaselineAssessment({ petName: "" });
    const blank = generateBaselineAssessment({ petName: "   " });
    for (const q of empty) {
      expect(q.prompt).toContain("your pet");
    }
    for (const q of blank) {
      expect(q.prompt).toContain("your pet");
    }
  });

  it("energy uses a 1..5 scale", () => {
    const energy = generateBaselineAssessment({ petName: "Luna" }).find(
      (q) => q.dimensionId === "energy"
    );
    expect(energy?.ui.kind).toBe("scale_1_5");
    if (energy?.ui.kind === "scale_1_5") {
      expect(energy.ui.min).toBe(1);
      expect(energy.ui.max).toBe(5);
    }
  });

  it("single-select dimensions expose all DB-allowed values", () => {
    const qs = generateBaselineAssessment({ petName: "Luna" });

    const social = qs.find((q) => q.dimensionId === "social");
    expect(social?.ui.kind).toBe("single_select");
    if (social?.ui.kind === "single_select") {
      expect(social.ui.options.map((o) => o.value).sort()).toEqual(
        [...SOCIAL_DISPOSITIONS].sort()
      );
    }

    const food = qs.find((q) => q.dimensionId === "food");
    if (food?.ui.kind === "single_select") {
      expect(food.ui.options.map((o) => o.value).sort()).toEqual(
        [...FOOD_MOTIVATIONS].sort()
      );
    }

    const vocal = qs.find((q) => q.dimensionId === "vocalization");
    if (vocal?.ui.kind === "single_select") {
      expect(vocal.ui.options.map((o) => o.value).sort()).toEqual(
        [...VOCALIZATION_LEVELS].sort()
      );
    }
  });

  it("sleep is a compound question covering all restfulness options", () => {
    const sleep = generateBaselineAssessment({ petName: "Luna" }).find(
      (q) => q.dimensionId === "sleep"
    );
    expect(sleep?.ui.kind).toBe("compound_sleep");
    if (sleep?.ui.kind === "compound_sleep") {
      expect(sleep.ui.restfulnessOptions.map((o) => o.value).sort()).toEqual(
        [...SLEEP_RESTFULNESS_OPTIONS].sort()
      );
    }
  });

  it("reactivity caps multi-select at MAX_STRESS_TRIGGERS (3)", () => {
    const reactivity = generateBaselineAssessment({ petName: "Luna" }).find(
      (q) => q.dimensionId === "reactivity"
    );
    expect(reactivity?.ui.kind).toBe("multi_select");
    if (reactivity?.ui.kind === "multi_select") {
      expect(reactivity.ui.maxSelections).toBe(MAX_STRESS_TRIGGERS);
      expect(reactivity.ui.maxSelections).toBe(3);
      expect(reactivity.ui.options.length).toBeGreaterThanOrEqual(3);
    }
  });
});
