import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import {
  behaviorBaselineQueryKey,
  getBaselineContext,
  upsertBehaviorBaseline,
} from "@/services/behaviorBaseline";
import {
  BASELINE_DIMENSION_ORDER,
  generateBaselineAssessment,
  type BaselineDimensionId,
} from "@/services/behaviorBaselineAssessment";
import {
  MAX_STRESS_TRIGGERS,
  type EnergyLevel,
  type FoodMotivation,
  type SleepRestfulness,
  type SocialDisposition,
  type VocalizationLevel,
} from "@/types/behaviorBaseline";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FormState = {
  energy: EnergyLevel | null;
  social: SocialDisposition | null;
  food: FoodMotivation | null;
  sleepHoursText: string;
  sleepRestfulness: SleepRestfulness | null;
  sleepSafeSpot: string;
  vocalization: VocalizationLevel | null;
  reactivity: string[];
};

const EMPTY_FORM: FormState = {
  energy: null,
  social: null,
  food: null,
  sleepHoursText: "",
  sleepRestfulness: null,
  sleepSafeSpot: "",
  vocalization: null,
  reactivity: [],
};

export default function PetBehaviorBaselineScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { pets } = usePets();
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const pet = pets.find((p) => p.id === petId);

  const questions = useMemo(
    () => generateBaselineAssessment({ petName: pet?.name ?? "" }),
    [pet?.name]
  );

  const { data: existing, isLoading } = useQuery({
    queryKey: behaviorBaselineQueryKey(petId),
    queryFn: () => getBaselineContext(petId!),
    enabled: !!petId,
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!existing) return;
    setForm({
      energy: clampEnergy(existing.energy_level_1_to_5),
      social: existing.social_disposition as SocialDisposition,
      food: existing.food_motivation as FoodMotivation,
      sleepHoursText:
        existing.typical_deep_sleep_hours == null
          ? ""
          : String(existing.typical_deep_sleep_hours),
      sleepRestfulness: (existing.sleep_restfulness as SleepRestfulness | null) ?? null,
      sleepSafeSpot: existing.sleep_safe_spot ?? "",
      vocalization: existing.vocalization_level as VocalizationLevel,
      reactivity: existing.stress_triggers ?? [],
    });
  }, [existing]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!petId) throw new Error("Missing pet");
      const energy = form.energy;
      if (energy == null) throw new Error("Pick an energy level (1–5).");
      if (!form.social) throw new Error("Choose a social disposition.");
      if (!form.food) throw new Error("Choose a food motivation.");
      if (!form.vocalization) throw new Error("Choose a vocalization level.");

      const sleepHours = parseSleepHours(form.sleepHoursText);

      return upsertBehaviorBaseline({
        pet_id: petId,
        energy_level_1_to_5: energy,
        social_disposition: form.social,
        food_motivation: form.food,
        typical_deep_sleep_hours: sleepHours,
        sleep_restfulness: form.sleepRestfulness ?? null,
        sleep_safe_spot: form.sleepSafeSpot.trim() || null,
        vocalization_level: form.vocalization,
        stress_triggers: form.reactivity.slice(0, MAX_STRESS_TRIGGERS),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: behaviorBaselineQueryKey(petId) });
      queryClient.invalidateQueries({ queryKey: ["health_briefing", petId] });
      queryClient.invalidateQueries({ queryKey: ["pet_journal"] });
      router.back();
    },
    onError: (e: unknown) => {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
    },
  });

  if (!petId || !pet) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <Text style={{ color: theme.secondary }}>Missing pet</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={{ fontSize: 16, color: theme.primary }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "700", color: theme.foreground }}>
          Behavior baseline
        </Text>
        <View style={{ width: 56 }} />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              fontSize: 13,
              color: theme.secondary,
              marginBottom: 16,
              lineHeight: 18,
            }}
          >
            Tells Milo and your journal what&rsquo;s normal for {pet.name}, so we can
            notice changes vs usual. You can update it any time.
          </Text>

          {BASELINE_DIMENSION_ORDER.map((id) => {
            const q = questions.find((x) => x.dimensionId === id)!;
            return (
              <View key={id} style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: theme.foreground,
                    marginBottom: 6,
                  }}
                >
                  {q.prompt}
                </Text>
                {q.helperText ? (
                  <Text
                    style={{ fontSize: 12, color: theme.secondary, marginBottom: 10 }}
                  >
                    {q.helperText}
                  </Text>
                ) : null}
                {renderQuestionControl(id, q.ui, form, setForm, theme, isDark)}
              </View>
            );
          })}

          <TouchableOpacity
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              opacity: mutation.isPending ? 0.7 : 1,
            }}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>
                  {existing ? "Update baseline" : "Save baseline"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function renderQuestionControl(
  id: BaselineDimensionId,
  ui: ReturnType<typeof generateBaselineAssessment>[number]["ui"],
  form: FormState,
  setForm: React.Dispatch<React.SetStateAction<FormState>>,
  theme: ReturnType<typeof useTheme>["theme"],
  isDark: boolean
) {
  if (ui.kind === "scale_1_5") {
    return (
      <View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => {
            const active = form.energy === n;
            return (
              <Pressable
                key={n}
                onPress={() => setForm((f) => ({ ...f, energy: n as EnergyLevel }))}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: active
                    ? theme.primary
                    : isDark
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(0,0,0,0.1)",
                  backgroundColor: active
                    ? "rgba(59,208,210,0.15)"
                    : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: active ? theme.primary : theme.foreground,
                  }}
                >
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <Text style={{ fontSize: 11, color: theme.secondary }}>{ui.minLabel}</Text>
          <Text style={{ fontSize: 11, color: theme.secondary }}>{ui.maxLabel}</Text>
        </View>
      </View>
    );
  }

  if (ui.kind === "single_select") {
    const value =
      id === "social"
        ? form.social
        : id === "food"
          ? form.food
          : id === "vocalization"
            ? form.vocalization
            : null;
    return (
      <View style={{ gap: 8 }}>
        {ui.options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                setForm((f) => {
                  if (id === "social")
                    return { ...f, social: opt.value as SocialDisposition };
                  if (id === "food")
                    return { ...f, food: opt.value as FoodMotivation };
                  if (id === "vocalization")
                    return { ...f, vocalization: opt.value as VocalizationLevel };
                  return f;
                });
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: active
                  ? theme.primary
                  : isDark
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(0,0,0,0.1)",
                backgroundColor: active
                  ? "rgba(59,208,210,0.12)"
                  : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: active ? "600" : "500",
                  color: theme.foreground,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  if (ui.kind === "multi_select") {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ui.options.map((opt) => {
          const active = form.reactivity.includes(opt.value);
          const disabled =
            !active && form.reactivity.length >= ui.maxSelections;
          return (
            <Pressable
              key={opt.value}
              disabled={disabled}
              onPress={() => {
                setForm((f) => {
                  if (active) {
                    return {
                      ...f,
                      reactivity: f.reactivity.filter((v) => v !== opt.value),
                    };
                  }
                  if (f.reactivity.length >= ui.maxSelections) return f;
                  return { ...f, reactivity: [...f.reactivity, opt.value] };
                });
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 100,
                borderWidth: 1,
                borderColor: active
                  ? theme.primary
                  : isDark
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(0,0,0,0.1)",
                backgroundColor: active
                  ? "rgba(59,208,210,0.15)"
                  : "transparent",
                opacity: disabled ? 0.4 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: theme.foreground,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View>
        <Text
          style={{ fontSize: 12, color: theme.secondary, marginBottom: 6 }}
        >
          Typical deep sleep (hours / day)
        </Text>
        <TextInput
          value={form.sleepHoursText}
          onChangeText={(v) => setForm((f) => ({ ...f, sleepHoursText: v }))}
          placeholder="e.g. 12"
          placeholderTextColor={theme.secondary}
          keyboardType="decimal-pad"
          style={{
            borderWidth: 1,
            borderColor: isDark
              ? "rgba(255,255,255,0.15)"
              : "rgba(0,0,0,0.1)",
            borderRadius: 12,
            padding: 12,
            fontSize: 16,
            color: theme.foreground,
          }}
        />
      </View>

      <View>
        <Text
          style={{ fontSize: 12, color: theme.secondary, marginBottom: 6 }}
        >
          Restfulness
        </Text>
        <View style={{ gap: 8 }}>
          {ui.kind === "compound_sleep" &&
            ui.restfulnessOptions.map((opt) => {
              const active = form.sleepRestfulness === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() =>
                    setForm((f) => ({
                      ...f,
                      sleepRestfulness:
                        f.sleepRestfulness === opt.value ? null : opt.value,
                    }))
                  }
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: active
                      ? theme.primary
                      : isDark
                        ? "rgba(255,255,255,0.15)"
                        : "rgba(0,0,0,0.1)",
                    backgroundColor: active
                      ? "rgba(59,208,210,0.12)"
                      : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 14, color: theme.foreground }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
        </View>
      </View>

      <View>
        <Text
          style={{ fontSize: 12, color: theme.secondary, marginBottom: 6 }}
        >
          Safe spot (optional)
        </Text>
        <TextInput
          value={form.sleepSafeSpot}
          onChangeText={(v) => setForm((f) => ({ ...f, sleepSafeSpot: v }))}
          placeholder="e.g. crate by the window"
          placeholderTextColor={theme.secondary}
          style={{
            borderWidth: 1,
            borderColor: isDark
              ? "rgba(255,255,255,0.15)"
              : "rgba(0,0,0,0.1)",
            borderRadius: 12,
            padding: 12,
            fontSize: 16,
            color: theme.foreground,
          }}
        />
      </View>
    </View>
  );
}

function clampEnergy(v: number | null): EnergyLevel | null {
  if (v == null) return null;
  if (v < 1) return 1;
  if (v > 5) return 5;
  return v as EnergyLevel;
}

function parseSleepHours(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 24) return null;
  return Math.round(n * 10) / 10;
}
