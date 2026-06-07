import type { DailyIntake } from "@/services/dailyIntake";

export function buildTodayHabitSummary(intake: DailyIntake | null | undefined): string {
  if (!intake) return "Tap rings to log meals and water.";

  const foodDone = intake.food_intake >= intake.food_target;
  const waterDone = intake.water_intake >= intake.water_target;
  const foodLeft = Math.max(0, intake.food_target - intake.food_intake);
  const waterLeft = Math.max(0, intake.water_target - intake.water_intake);

  if (intake.food_intake === 0 && intake.water_intake === 0 && intake.poop_count === 0 && intake.pee_count === 0) {
    return "Nothing logged yet today — tap a ring or output to start.";
  }

  if (foodDone && waterDone) {
    return "Meals and water are on track for today.";
  }

  if (foodDone && waterLeft > 0) {
    return waterLeft === 1 ? "Meals done — one cup of water to go." : `${waterLeft} cups of water left to log.`;
  }

  if (waterDone && foodLeft > 0) {
    return foodLeft === 1 ? "Water done — one meal left to log." : `${foodLeft} meals left to log.`;
  }

  const parts: string[] = [];
  if (foodLeft > 0) parts.push(`${foodLeft} meal${foodLeft === 1 ? "" : "s"}`);
  if (waterLeft > 0) parts.push(`${waterLeft} cup${waterLeft === 1 ? "" : "s"} water`);
  return `Good progress — ${parts.join(" and ")} left.`;
}

export function formatTodayDateLine(date = new Date()): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
