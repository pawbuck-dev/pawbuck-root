export type TodayDashboardProgress = {
  completed: number;
  total: number;
  foodDone: boolean;
  waterDone: boolean;
  outputDone: boolean;
  walkDone: boolean;
};

/** Daily hook progress: food, water, any output, walk goal (or any walk if no goal). */
export function computeTodayDashboardProgress(input: {
  foodIntake: number;
  foodTarget: number;
  waterIntake: number;
  waterTarget: number;
  poopCount: number;
  peeCount: number;
  todayMeters: number;
  goalMeters: number;
}): TodayDashboardProgress {
  const foodTarget = Math.max(1, input.foodTarget);
  const waterTarget = Math.max(1, input.waterTarget);
  const foodDone = input.foodIntake >= foodTarget;
  const waterDone = input.waterIntake >= waterTarget;
  const outputDone = input.poopCount > 0 || input.peeCount > 0;
  const walkDone =
    input.goalMeters > 0
      ? input.todayMeters >= input.goalMeters
      : input.todayMeters > 0;

  const flags = [foodDone, waterDone, outputDone, walkDone];
  return {
    completed: flags.filter(Boolean).length,
    total: 4,
    foodDone,
    waterDone,
    outputDone,
    walkDone,
  };
}

export function formatTodayProgressLabel(progress: TodayDashboardProgress): string {
  if (progress.completed >= progress.total) return "Today complete";
  return `${progress.completed}/${progress.total} logged today`;
}
