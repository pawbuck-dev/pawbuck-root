import { CTA } from "@/components/ui";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
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
const CURRENT_STEP = 9;
const MICROCHIP_MAX_LENGTH = 15;

export default function OnboardingStep9() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData } = useOnboarding();
  const insets = useSafeAreaInsets();
  const isDark = mode === "dark";

  const [microchipNumber, setMicrochipNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");

  const progressPercent = (CURRENT_STEP / TOTAL_STEPS) * 100;
  const accentColor = isDark ? "#5FC4C0" : "#2BA89E";
  const mutedText = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

  const hasMicrochip = microchipNumber.trim().length > 0;
  const hasPassport = passportNumber.trim().length > 0;
  const isValidMicrochip =
    !hasMicrochip || microchipNumber.trim().length === MICROCHIP_MAX_LENGTH;
  const hasData = hasMicrochip || hasPassport;

  const handleFinish = () => {
    if (hasMicrochip && isValidMicrochip) {
      updatePetData({ microchip_number: microchipNumber.trim() });
    }
    if (hasPassport) {
      updatePetData({ passport_number: passportNumber.trim() });
    }
    router.push("/onboarding/review");
  };

  const handleSkip = () => {
    router.push("/onboarding/review");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.root}>
          <StatusBar style={isDark ? "light" : "dark"} />

          {/* Header: back arrow + progress bar */}
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={() => router.back()}
              style={[
                styles.backBtn,
                { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" },
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={theme.foreground} />
            </Pressable>

            <View style={styles.progressBarWrap}>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)" },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercent}%`, backgroundColor: accentColor },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Heading + Subtitle (fixed above ScrollView) */}
          <View style={styles.headingWrap}>
            <Text style={[styles.heading, { color: theme.foreground }]}>Pet identification</Text>
            <Text style={[styles.subtitle, { color: mutedText }]}>
              Optional details to help identify your pet if needed.
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
              {/* Microchip Number */}
              <Text style={[styles.label, { color: theme.foreground }]}>
                Microchip Number
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                    color: theme.foreground,
                  },
                ]}
                placeholder="15-digit number"
                placeholderTextColor={mutedText}
                value={microchipNumber}
                onChangeText={(text) => {
                  if (text.length <= MICROCHIP_MAX_LENGTH) {
                    setMicrochipNumber(text);
                  }
                }}
                keyboardType="numeric"
                maxLength={MICROCHIP_MAX_LENGTH}
                returnKeyType="next"
              />
              <Text style={[styles.helperText, { color: mutedText }]}>
                Found on vet or adoption records.
              </Text>

              {/* Validation error */}
              {hasMicrochip && !isValidMicrochip && (
                <Text style={styles.errorText}>
                  Microchip number must be exactly 15 digits
                </Text>
              )}

              {/* Pet Passport Number */}
              <Text style={[styles.label, { color: theme.foreground, marginTop: 20 }]}>
                Pet Passport Number
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                    color: theme.foreground,
                  },
                ]}
                placeholder="e.g., US-2026-84721"
                placeholderTextColor={mutedText}
                value={passportNumber}
                onChangeText={setPassportNumber}
                returnKeyType="done"
                onSubmitEditing={handleFinish}
              />
              <Text style={[styles.helperText, { color: mutedText }]}>
                Only if your pet has an official passport.
              </Text>

              {/* CTAs */}
              <View style={[styles.ctaWrap, { paddingBottom: Math.max(24, insets.bottom) }]}>
                <CTA
                  label="Finish Setup"
                  size="LG"
                  style="Solid"
                  state={hasData && isValidMicrochip ? "Default" : "Disable"}
                  onPress={handleFinish}
                  disabled={hasData && !isValidMicrochip}
                  containerStyle={styles.ctaBtn}
                />
                <CTA
                  label="Skip for Now"
                  size="LG"
                  style="Outline"
                  state="Default"
                  onPress={handleSkip}
                  containerStyle={styles.ctaBtn}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
  progressBarWrap: {
    flex: 1,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 0,
    flexGrow: 1,
  },
  headingWrap: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  input: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  helperText: {
    fontSize: 13,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    marginTop: 6,
    color: "#EF4444",
  },
  ctaWrap: {
    marginTop: "auto",
    paddingTop: 16,
    gap: 12,
  },
  ctaBtn: {
    width: "100%",
    alignSelf: "stretch",
  },
});
