import type { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import {
  DEFAULT_ML_PER_CUP,
  resolveIntakePrefs,
  suggestIntakeFromPet,
  type PetWithIntakePrefs,
} from "@/utils/intakeBreedSuggestions";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

export type DailyIntakeConfigSave = {
  mealsPerDay: number;
  gramsPerMeal: number;
  waterCupsPerDay: number;
  mlPerCup: number;
};

type DailyIntakeConfigModalProps = {
  visible: boolean;
  onClose: () => void;
  pet: Pet | null;
  onSave: (config: DailyIntakeConfigSave) => Promise<void>;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function Stepper({
  value,
  onChange,
  min,
  max,
  step,
  format,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
  disabled?: boolean;
}) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const circleBg = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";
  return (
    <View className="flex-row items-center gap-3">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        disabled={disabled || value <= min}
        onPress={() => onChange(clamp(value - step, min, max))}
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: circleBg, opacity: disabled || value <= min ? 0.35 : 1 }}
      >
        <Ionicons name="remove" size={22} color={theme.foreground} />
      </TouchableOpacity>
      <Text className="min-w-[72px] text-center text-lg font-bold" style={{ color: theme.foreground }}>
        {format(value)}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Increase"
        disabled={disabled || value >= max}
        onPress={() => onChange(clamp(value + step, min, max))}
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: circleBg, opacity: disabled || value >= max ? 0.35 : 1 }}
      >
        <Ionicons name="add" size={22} color={theme.foreground} />
      </TouchableOpacity>
    </View>
  );
}

export default function DailyIntakeConfigModal({ visible, onClose, pet, onSave }: DailyIntakeConfigModalProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const suggestion = useMemo(
    () =>
      suggestIntakeFromPet({
        animal_type: pet?.animal_type ?? "dog",
        breed: pet?.breed ?? "",
        weight_value: pet?.weight_value ?? null,
        weight_unit: pet?.weight_unit ?? null,
      }),
    [pet?.animal_type, pet?.breed, pet?.weight_value, pet?.weight_unit]
  );

  const [meals, setMeals] = useState(3);
  const [grams, setGrams] = useState(150);
  const [cups, setCups] = useState(6);
  const [mlPerCup, setMlPerCup] = useState(DEFAULT_ML_PER_CUP);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    const r = resolveIntakePrefs(pet as PetWithIntakePrefs | null);
    setMeals(r.mealsPerDay);
    setGrams(r.gramsPerMeal);
    setCups(r.waterCupsPerDay);
    setMlPerCup(r.mlPerCup);
  }, [visible, pet]);

  const applySuggestion = useCallback(() => {
    setMeals(suggestion.mealsPerDay);
    setGrams(suggestion.gramsPerMeal);
    setCups(suggestion.waterCupsPerDay);
    setMlPerCup(suggestion.mlPerCup);
    setError(null);
  }, [suggestion]);

  const handleSave = async () => {
    if (meals < 1 || meals > 12 || cups < 1 || cups > 20) {
      setError("Meals and cups must be within the allowed range.");
      return;
    }
    if (grams < 20 || grams > 800 || mlPerCup < 50 || mlPerCup > 500) {
      setError("Grams per meal and ml per cup look out of range. Adjust and try again.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        mealsPerDay: meals,
        gramsPerMeal: grams,
        waterCupsPerDay: cups,
        mlPerCup,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
          <View
            className="rounded-t-3xl px-6 pt-6 pb-8"
            style={{
              backgroundColor: isDark ? "#1A2026" : theme.card,
              maxHeight: "88%",
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="pr-4 text-xl font-bold" style={{ color: theme.foreground }}>
                  Configure Daily Intake
                </Text>
                <TouchableOpacity onPress={onClose} hitSlop={12}>
                  <Ionicons name="close" size={24} color={theme.secondary} />
                </TouchableOpacity>
              </View>

              <View
                className="mb-5 rounded-xl border px-3 py-3"
                style={{
                  borderColor: theme.border,
                  backgroundColor: isDark ? "#2A3441" : theme.background,
                }}
              >
                <Text className="text-xs font-semibold uppercase" style={{ color: theme.secondary }}>
                  Suggested from breed and weight
                </Text>
                <Text className="mt-1 text-sm leading-5" style={{ color: theme.foreground }}>
                  {suggestion.summary}{" "}
                  <Text style={{ fontWeight: "700" }}>
                    ~{suggestion.mealsPerDay} meals × {suggestion.gramsPerMeal}g · {suggestion.waterCupsPerDay} cups ×{" "}
                    {suggestion.mlPerCup}ml.
                  </Text>
                </Text>
                <TouchableOpacity
                  onPress={applySuggestion}
                  className="mt-3 self-start rounded-lg px-3 py-2"
                  style={{ backgroundColor: theme.primary }}
                  activeOpacity={0.85}
                >
                  <Text className="text-sm font-bold" style={{ color: theme.primaryForeground }}>
                    Apply suggestion
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="mb-3 text-base font-bold" style={{ color: theme.foreground }}>
                🍖 Food
              </Text>
              <View className="mb-4 flex-row flex-wrap justify-between gap-y-4">
                <View style={{ width: "48%" }}>
                  <Text className="mb-2 text-sm font-semibold" style={{ color: theme.secondary }}>
                    Meals per day
                  </Text>
                  <Stepper
                    value={meals}
                    onChange={setMeals}
                    min={1}
                    max={8}
                    step={1}
                    format={(n) => String(n)}
                    disabled={saving}
                  />
                </View>
                <View style={{ width: "48%" }}>
                  <Text className="mb-2 text-sm font-semibold" style={{ color: theme.secondary }}>
                    Grams per meal
                  </Text>
                  <Stepper
                    value={grams}
                    onChange={setGrams}
                    min={30}
                    max={600}
                    step={5}
                    format={(n) => `${n}g`}
                    disabled={saving}
                  />
                </View>
              </View>

              <Text className="mb-3 text-base font-bold" style={{ color: theme.foreground }}>
                💦 Water
              </Text>
              <View className="mb-5 flex-row flex-wrap justify-between gap-y-4">
                <View style={{ width: "48%" }}>
                  <Text className="mb-2 text-sm font-semibold" style={{ color: theme.secondary }}>
                    Cups per day
                  </Text>
                  <Stepper
                    value={cups}
                    onChange={setCups}
                    min={2}
                    max={16}
                    step={1}
                    format={(n) => String(n)}
                    disabled={saving}
                  />
                </View>
                <View style={{ width: "48%" }}>
                  <Text className="mb-2 text-sm font-semibold" style={{ color: theme.secondary }}>
                    ml per cup
                  </Text>
                  <Stepper
                    value={mlPerCup}
                    onChange={setMlPerCup}
                    min={50}
                    max={400}
                    step={10}
                    format={(n) => `${n}ml`}
                    disabled={saving}
                  />
                </View>
              </View>

              <Text className="mb-3 text-xs leading-5" style={{ color: theme.secondary }}>
                Estimates only—not veterinary advice. Your taps on the body tracker still count meals and cups; grams and
                ml here set how we convert those taps into approximate daily totals for your journal.
              </Text>

              {error ? (
                <Text className="mb-3 text-sm font-semibold" style={{ color: "#DC2626" }}>
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                onPress={() => void handleSave()}
                disabled={saving}
                className="flex-row items-center justify-center rounded-xl py-4"
                style={{ backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color={theme.primaryForeground} style={{ marginRight: 10 }} />
                ) : null}
                <Text className="text-center text-base font-bold" style={{ color: theme.primaryForeground }}>
                  {saving ? "Saving…" : "Save"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
