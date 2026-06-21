import type { DailyIntake } from "@/services/dailyIntake";

export function buildTodayHabitSummary(intake: DailyIntake | null | undefined): string {
  if (!intake) return "Tap rings to log meals and water.";

  const foodDone = intake.food_intake >= intake.food_target;
  const waterDone = intake.water_intake >= intake.water_target;
  const foodLeft = Math.max(0, intake.food_target - intake.food_intake);
  const waterLeft = Math.max(0, intake.water_target - intake.water_intake);
  const outputTotal = intake.poop_count + intake.pee_count;
  const outputTarget = Math.max(intake.poop_target, intake.pee_target, 1);
  const outputDone = outputTotal >= 1;

  if (
    intake.food_intake === 0 &&
    intake.water_intake === 0 &&
    intake.poop_count === 0 &&
    intake.pee_count === 0
  ) {
    return "Nothing logged yet today — tap a ring or output to start.";
  }

  if (foodDone && waterDone && outputDone) {
    return "Meals, water, and bathroom breaks are on track for today.";
  }

  if (foodDone && waterDone && !outputDone) {
    return "Meals and water done — log a bathroom break when ready (long-press rings to adjust).";
  }

  if (foodDone && waterLeft > 0) {
    const waterLine =
      waterLeft === 1 ? "one cup of water to go" : `${waterLeft} cups of water left to log`;
    const outputHint =
      outputTotal > 0
        ? ` · ${outputTotal} bathroom break${outputTotal === 1 ? "" : "s"} logged`
        : "";
    return `Meals done — ${waterLine}${outputHint}. Long-press rings to undo or adjust.`;
  }

  if (waterDone && foodLeft > 0) {
    const outputHint =
      outputTotal > 0
        ? ` · ${outputTotal} bathroom break${outputTotal === 1 ? "" : "s"} logged`
        : "";
    return foodLeft === 1
      ? `Water done — one meal left to log${outputHint}.`
      : `${foodLeft} meals left to log${outputHint}.`;
  }

  if (outputTotal > 0 && !foodDone && !waterDone) {
    const breaks =
      outputTotal === 1 ? "1 bathroom break logged" : `${outputTotal} bathroom breaks logged`;
    return `${breaks} — keep going with meals and water.`;
  }

  const parts: string[] = [];
  if (foodLeft > 0) parts.push(`${foodLeft} meal${foodLeft === 1 ? "" : "s"}`);
  if (waterLeft > 0) parts.push(`${waterLeft} cup${waterLeft === 1 ? "" : "s"} water`);
  if (outputTotal > 0 && outputTotal < outputTarget) {
    parts.push(`${outputTotal} bathroom break${outputTotal === 1 ? "" : "s"} logged`);
  }
  const base = parts.length ? `Good progress — ${parts.join(" and ")}.` : "Good progress today.";
  return `${base} Long-press rings to undo or adjust.`;
}

export function formatTodayDateLine(date = new Date()): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
