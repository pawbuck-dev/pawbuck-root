import { IntakeProgressRing } from "@/components/home/IntakeProgressRing";
import { habitRingPercent } from "@/constants/habitRingColors";
import StartWalkSlider from "@/components/home/StartWalkSlider";
import { formatMiles, metersToMiles } from "@/constants/pawthonUi";
import { useTheme } from "@/context/themeContext";
import { getDailyIntake, updateDailyIntake, type DailyIntake } from "@/services/dailyIntake";
import { buildTodayHabitSummary, formatTodayDateLine } from "@/utils/todayHabitSummary";
import { nextIntakeCount } from "@/utils/dailyIntakeMutations";
import type { TodayDashboardProgress } from "@/utils/todayDashboardProgress";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";

export type BodyTrackerSegment = "intake" | "output" | "weight";

type Props = {
  petId: string;
  petName?: string;
  todayProgress?: TodayDashboardProgress;
  streakDays?: number;
  walkGoalMeters?: number;
  walkTodayMeters?: number;
  onStartWalk?: () => void;
  onViewWalkLog?: () => void;
  onOpenBodyTracker?: (segment?: BodyTrackerSegment) => void;
  showDateHeader?: boolean;
  embedded?: boolean;
};

const HABIT_RING_SIZE = 58;

export default function TodayHabitPanel({
  petId,
  petName,
  todayProgress,
  streakDays = 0,
  walkGoalMeters = 0,
  walkTodayMeters = 0,
  onStartWalk,
  onViewWalkLog,
  onOpenBodyTracker,
  showDateHeader = true,
  embedded = false,
}: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const queryClient = useQueryClient();
  const intakeQueryKey = ["daily_intake", petId];

  const { data: intake, isLoading } = useQuery({
    queryKey: intakeQueryKey,
    queryFn: () => getDailyIntake(petId),
    enabled: !!petId,
  });

  const mutation = useMutation({
    mutationFn: (updates: Partial<Pick<DailyIntake, "food_intake" | "water_intake" | "poop_count" | "pee_count">>) =>
      updateDailyIntake(petId, updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: intakeQueryKey });
      const previous = queryClient.getQueryData<DailyIntake>(intakeQueryKey);
      if (previous) {
        queryClient.setQueryData<DailyIntake>(intakeQueryKey, { ...previous, ...updates });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(intakeQueryKey, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: intakeQueryKey }),
  });

  const foodIntake = intake?.food_intake ?? 0;
  const waterIntake = intake?.water_intake ?? 0;
  const foodTarget = intake?.food_target ?? 3;
  const waterTarget = intake?.water_target ?? 4;
  const poopCount = intake?.poop_count ?? 0;
  const peeCount = intake?.pee_count ?? 0;
  const poopTarget = intake?.poop_target ?? 6;
  const peeTarget = intake?.pee_target ?? 6;

  const adjustCount = useCallback(
    (
      field: "food_intake" | "water_intake" | "poop_count" | "pee_count",
      current: number,
      delta: number,
      max?: number
    ) => {
      const next = nextIntakeCount(current, delta, max);
      if (next === current) return;
      mutation.mutate({ [field]: next });
    },
    [mutation]
  );

  const bumpFood = useCallback(() => {
    adjustCount("food_intake", foodIntake, 1, foodTarget);
  }, [adjustCount, foodIntake, foodTarget]);

  const bumpWater = useCallback(() => {
    adjustCount("water_intake", waterIntake, 1, waterTarget);
  }, [adjustCount, waterIntake, waterTarget]);

  const bumpPoop = useCallback(() => {
    adjustCount("poop_count", poopCount, 1, poopTarget);
  }, [adjustCount, poopCount, poopTarget]);

  const bumpPee = useCallback(() => {
    adjustCount("pee_count", peeCount, 1, peeTarget);
  }, [adjustCount, peeCount, peeTarget]);

  const decFood = useCallback(() => adjustCount("food_intake", foodIntake, -1), [adjustCount, foodIntake]);
  const decWater = useCallback(() => adjustCount("water_intake", waterIntake, -1), [adjustCount, waterIntake]);
  const decPoop = useCallback(() => adjustCount("poop_count", poopCount, -1), [adjustCount, poopCount]);
  const decPee = useCallback(() => adjustCount("pee_count", peeCount, -1), [adjustCount, peeCount]);

  const walkProgress = walkGoalMeters > 0 ? Math.min(1, walkTodayMeters / walkGoalMeters) : 0;
  const todayMi = formatMiles(metersToMiles(walkTodayMeters));
  const goalMi = formatMiles(metersToMiles(walkGoalMeters));

  const borderStyle =
    Platform.OS === "android"
      ? {}
      : {
          borderWidth: 1 as const,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        };

  const summary = buildTodayHabitSummary(intake);

  return (
    <View
      style={{
        marginHorizontal: embedded ? 0 : 20,
        marginBottom: 16,
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
        borderRadius: 20,
        padding: 16,
        ...borderStyle,
      }}
    >
      {showDateHeader ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="sunny-outline" size={16} color={theme.primary} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: theme.foreground }}>Today</Text>
            <Text style={{ fontSize: 13, color: theme.secondary }}>{formatTodayDateLine()}</Text>
          </View>
          {streakDays >= 3 ? (
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#EA580C" }}>🔥 {streakDays}d</Text>
          ) : null}
        </View>
      ) : null}

      <Text style={{ fontSize: 14, color: theme.secondary, lineHeight: 20, marginBottom: 12 }}>
        {summary}
      </Text>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 12 }} />
      ) : (
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.6,
                color: theme.secondary,
                textTransform: "uppercase",
              }}
            >
              Intake & output
            </Text>
            {onOpenBodyTracker ? (
              <Text style={{ fontSize: 11, color: theme.secondary }}>long-press to undo</Text>
            ) : null}
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: 2,
              marginBottom: 14,
            }}
          >
            <IntakeProgressRing
              emoji="🍚"
              label="Food"
              value={`${foodIntake}/${foodTarget}`}
              percent={habitRingPercent(foodIntake, foodTarget)}
              variant="food"
              onPress={bumpFood}
              onLongPress={decFood}
              size={HABIT_RING_SIZE}
            />
            <IntakeProgressRing
              emoji="💧"
              label="Water"
              value={`${waterIntake}/${waterTarget}`}
              percent={habitRingPercent(waterIntake, waterTarget)}
              variant="water"
              onPress={bumpWater}
              onLongPress={decWater}
              size={HABIT_RING_SIZE}
            />
            <IntakeProgressRing
              emoji="💩"
              label="Poop"
              value={`${poopCount}/${poopTarget}`}
              percent={habitRingPercent(poopCount, poopTarget)}
              variant="poop"
              onPress={bumpPoop}
              onLongPress={decPoop}
              size={HABIT_RING_SIZE}
            />
            <IntakeProgressRing
              emoji="💦"
              label="Pee"
              value={`${peeCount}/${peeTarget}`}
              percent={habitRingPercent(peeCount, peeTarget)}
              variant="pee"
              onPress={bumpPee}
              onLongPress={decPee}
              size={HABIT_RING_SIZE}
            />
          </View>

          {onStartWalk ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 0.6,
                    color: theme.secondary,
                    textTransform: "uppercase",
                  }}
                >
                  Walk
                </Text>
                {onViewWalkLog ? (
                  <Pressable onPress={onViewWalkLog} hitSlop={8}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary }}>Walk log</Text>
                  </Pressable>
                ) : null}
              </View>

              <StartWalkSlider
                onStartWalk={onStartWalk}
                walkProgress={walkProgress}
                todayMi={todayMi}
                goalMi={goalMi}
                walkGoalMeters={walkGoalMeters}
                goalMet={todayProgress?.walkDone}
                petName={petName}
              />
            </>
          ) : null}
        </>
      )}
    </View>
  );
}
