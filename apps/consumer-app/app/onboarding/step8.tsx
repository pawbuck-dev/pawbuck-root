import { CTA } from "@/components/ui";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOTAL_STEPS = 9;
const CURRENT_STEP = 8;
const WEIGHT_INPUT_ACCESSORY_ID = "onboardingWeightAccessory";

type WeightUnit = "pounds" | "kilograms";

export default function OnboardingStep8() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData, petData } = useOnboarding();
  const insets = useSafeAreaInsets();
  const isDark = mode === "dark";

  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<WeightUnit>("pounds");
  const [weightFieldFocused, setWeightFieldFocused] = useState(false);

  const petName = petData?.name || "your pet";
  const progressPercent = (CURRENT_STEP / TOTAL_STEPS) * 100;
  const accentColor = isDark ? "#5FC4C0" : "#2BA89E";
  const mutedText = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

  const isValid = weight.trim() !== "" && !isNaN(parseFloat(weight));

  const handleContinue = () => {
    if (isValid) {
      Keyboard.dismiss();
      updatePetData({
        weight_value: parseFloat(weight),
        weight_unit: unit,
      });
      router.push("/onboarding/step9");
    }
  };

  const handleSkipWeight = () => {
    Keyboard.dismiss();
    router.push("/onboarding/step9");
  };

  const showFooterCta = !weightFieldFocused;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID={WEIGHT_INPUT_ACCESSORY_ID}>
          <View
            style={[
              styles.accessoryBar,
              {
                borderTopColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                backgroundColor: isDark ? "#1a2222" : "#f2f6f6",
              },
            ]}
          >
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={12}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: accentColor }}>Done</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (isValid) handleContinue();
              }}
              disabled={!isValid}
              style={{ opacity: isValid ? 1 : 0.45 }}
              hitSlop={12}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Continue</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.root}>
          <StatusBar style={isDark ? "light" : "dark"} />

          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }]}
            >
              <Ionicons name="arrow-back" size={20} color={theme.foreground} />
            </Pressable>

            <View style={styles.progressBarWrap}>
              <View style={[styles.progressTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)" }]}>
                <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
              </View>
            </View>
          </View>

          <View style={styles.headingWrap}>
            <Text style={[styles.heading, { color: theme.foreground }]}>
              {petName}
              {"'"}s current weight?
            </Text>
            <Text style={[styles.subtitle, { color: mutedText }]}>
              Helps track health changes. You can update this anytime in your pet's profile.
            </Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.card,
                {
                  backgroundColor: cardBg,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  paddingHorizontal: 24,
                  paddingTop: 24,
                  paddingBottom: 40,
                  flex: 1,
                },
              ]}
            >
              <View style={styles.unitToggleWrap}>
                <View
                  style={[
                    styles.unitToggle,
                    {
                      backgroundColor: inputBg,
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => setUnit("pounds")}
                    style={[styles.unitBtn, unit === "pounds" && { backgroundColor: accentColor }]}
                  >
                    <Text
                      style={[
                        styles.unitBtnText,
                        { color: unit === "pounds" ? "#FFFFFF" : theme.foreground },
                      ]}
                    >
                      Pounds
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setUnit("kilograms")}
                    style={[styles.unitBtn, unit === "kilograms" && { backgroundColor: accentColor }]}
                  >
                    <Text
                      style={[
                        styles.unitBtnText,
                        { color: unit === "kilograms" ? "#FFFFFF" : theme.foreground },
                      ]}
                    >
                      Kilograms
                    </Text>
                  </Pressable>
                </View>
              </View>

              <Text style={[styles.label, { color: theme.foreground }]}>Weight in {unit}</Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                    color: theme.foreground,
                  },
                ]}
                placeholder="e.g., 45"
                placeholderTextColor={mutedText}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                returnKeyType="done"
                inputAccessoryViewID={
                  Platform.OS === "ios" ? WEIGHT_INPUT_ACCESSORY_ID : undefined
                }
                onFocus={() => setWeightFieldFocused(true)}
                onBlur={() => setWeightFieldFocused(false)}
              />

              {weightFieldFocused && Platform.OS === "android" ? (
                <Pressable
                  onPress={() => Keyboard.dismiss()}
                  style={{ alignSelf: "flex-end", marginTop: 8, paddingVertical: 8 }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: accentColor }}>Done</Text>
                </Pressable>
              ) : null}

              {showFooterCta ? (
                <View style={[styles.ctaWrap, { paddingBottom: Math.max(24, insets.bottom) }]}>
                  <CTA
                    label="Continue"
                    size="LG"
                    style="Solid"
                    state={isValid ? "Default" : "Disable"}
                    onPress={handleContinue}
                    disabled={!isValid}
                    containerStyle={styles.continueBtn}
                  />
                  <Pressable onPress={handleSkipWeight} style={{ marginTop: 12, paddingVertical: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: mutedText, textAlign: "center" }}>
                      Skip for now
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  accessoryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBarWrap: { flex: 1 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 0, paddingBottom: 0, flexGrow: 1 },
  headingWrap: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  card: { flex: 1 },
  heading: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 32 },
  unitToggleWrap: { alignItems: "center", marginBottom: 24 },
  unitToggle: { flexDirection: "row", borderRadius: 100, borderWidth: 1, overflow: "hidden" },
  unitBtn: { paddingVertical: 12, paddingHorizontal: 28, borderRadius: 100 },
  unitBtnText: { fontSize: 15, fontWeight: "600" },
  label: { fontSize: 15, fontWeight: "600", marginBottom: 10 },
  input: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, fontSize: 15, borderWidth: 1 },
  ctaWrap: { marginTop: "auto", paddingTop: 16 },
  continueBtn: { width: "100%", alignSelf: "stretch" },
});
