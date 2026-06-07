import { buildTodayHabitSummary } from "@/utils/todayHabitSummary";
import type { DailyIntake } from "@/services/dailyIntake";

function intake(partial: Partial<DailyIntake>): DailyIntake {
  return {
    id: "x",
    pet_id: "p",
    user_id: "u",
    date: "2026-06-02",
    food_intake: 0,
    water_intake: 0,
    food_target: 3,
    water_target: 4,
    poop_count: 0,
    pee_count: 0,
    poop_target: 6,
    pee_target: 6,
    poop_tags: [],
    pee_tags: [],
    poop_observation_note: null,
    poop_observation_photo_path: null,
    pee_observation_note: null,
    pee_observation_photo_path: null,
    poop_journal_entry_id: null,
    pee_journal_entry_id: null,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("buildTodayHabitSummary", () => {
  it("prompts when nothing logged", () => {
    expect(buildTodayHabitSummary(intake({}))).toContain("Nothing logged");
  });

  it("celebrates when meals and water are complete", () => {
    expect(buildTodayHabitSummary(intake({ food_intake: 3, water_intake: 4 }))).toContain(
      "on track"
    );
  });

  it("nudges water when meals are done", () => {
    expect(buildTodayHabitSummary(intake({ food_intake: 3, water_intake: 2 }))).toContain(
      "water"
    );
  });
});
