import { IntakeProgressRing } from "@/components/home/IntakeProgressRing";
import { useTheme } from "@/context/themeContext";
import { getDailyIntake, updateDailyIntake, type DailyIntake } from "@/services/dailyIntake";
import { buildTodayHabitSummary, formatTodayDateLine } from "@/utils/todayHabitSummary";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";

export type BodyTrackerSegment = "intake" | "output" | "weight";

type Props = {
  petId: string;
  streakDays?: number;
  /** Opens full body tracker (weight, photos, quality tags). */
  onOpenBodyTracker?: (segment?: BodyTrackerSegment) => void;
  showDateHeader?: boolean;
  /** When true, parent supplies horizontal padding (e.g. Pet Journal scroll). */
  embedded?: boolean;
};

function pct(count: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((Math.min(count, target) / target) * 100);
}

export default function TodayHabitPanel({
  petId,
  streakDays = 0,
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

  const bumpFood = useCallback(() => {
    if (foodIntake >= foodTarget) {
      onOpenBodyTracker?.("intake");
      return;
    }
    mutation.mutate({ food_intake: foodIntake + 1 });
  }, [foodIntake, foodTarget, mutation, onOpenBodyTracker]);

  const bumpWater = useCallback(() => {
    if (waterIntake >= waterTarget) {
      onOpenBodyTracker?.("intake");
      return;
    }
    mutation.mutate({ water_intake: waterIntake + 1 });
  }, [waterIntake, waterTarget, mutation, onOpenBodyTracker]);

  const bumpOutput = useCallback(
    (kind: "poop" | "pee") => {
      if (kind === "poop") {
        mutation.mutate({ poop_count: poopCount + 1 });
      } else {
        mutation.mutate({ pee_count: peeCount + 1 });
      }
    },
    [mutation, poopCount, peeCount]
  );

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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 100,
                backgroundColor: isDark ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.1)",
              }}
            >
              <Text style={{ fontSize: 12 }}>🔥</Text>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#EA580C" }}>
                {streakDays}-day streak
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Text style={{ fontSize: 14, color: theme.secondary, lineHeight: 20, marginBottom: 14 }}>
        {summary}
      </Text>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 12 }} />
      ) : (
        <>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 0.6,
              color: theme.secondary,
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            Intake
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              paddingHorizontal: 8,
              marginBottom: 16,
            }}
          >
            <IntakeProgressRing
              emoji="🍚"
              label="Food"
              value={`${foodIntake}/${foodTarget}`}
              percent={pct(foodIntake, foodTarget)}
              onPress={bumpFood}
            />
            <IntakeProgressRing
              emoji="💧"
              label="Water"
              value={`${waterIntake}/${waterTarget}`}
              percent={pct(waterIntake, waterTarget)}
              onPress={bumpWater}
            />
          </View>

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
              Output
            </Text>
            <Text style={{ fontSize: 11, color: theme.secondary }}>tap to log · hold for details</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => bumpOutput("poop")}
              onLongPress={() => onOpenBodyTracker?.("output")}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 14,
                borderRadius: 14,
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              }}
              accessibilityRole="button"
              accessibilityLabel={`Poop, ${poopCount} today`}
            >
              <Text style={{ fontSize: 22 }}>💩</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: theme.foreground }}>Poop</Text>
                <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 2 }}>
                  {poopCount === 0 ? "0 today" : `${poopCount} today`}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => bumpOutput("pee")}
              onLongPress={() => onOpenBodyTracker?.("output")}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 14,
                borderRadius: 14,
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              }}
              accessibilityRole="button"
              accessibilityLabel={`Pee, ${peeCount} today`}
            >
              <Text style={{ fontSize: 22 }}>💦</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: theme.foreground }}>Pee</Text>
                <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 2 }}>
                  {peeCount === 0 ? "0 today" : `${peeCount} today`}
                </Text>
              </View>
            </Pressable>
          </View>

          {onOpenBodyTracker ? (
            <Pressable
              onPress={() => onOpenBodyTracker("weight")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginTop: 14,
                paddingVertical: 8,
              }}
              accessibilityRole="button"
              accessibilityLabel="Open body tracker for weight and photos"
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.primary }}>
                Weight, photos & details
              </Text>
              <Ionicons name="chevron-forward" size={14} color={theme.primary} />
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}
