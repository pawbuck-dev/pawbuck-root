import { CTA } from "@/components/ui";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { checkEmailIdAvailable, validateEmailIdFormat } from "@/services/pets";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EMAIL_DOMAIN = "@pawbuck.app";
const TOTAL_STEPS = 9;
const CURRENT_STEP = 5;

export default function OnboardingStep5b() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData, petData } = useOnboarding();
  const insets = useSafeAreaInsets();
  const isDark = mode === "dark";

  const [emailId, setEmailId] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const progressPercent = (CURRENT_STEP / TOTAL_STEPS) * 100;
  const accentColor = isDark ? "#5FC4C0" : "#2BA89E";
  const mutedText = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const petName = petData?.name || "Your Pet";

  useEffect(() => {
    const trimmedEmailId = emailId.trim().toLowerCase();
    setIsAvailable(null);
    setCheckError(null);

    if (!trimmedEmailId) {
      setValidationError(null);
      return;
    }

    const { isValid, error } = validateEmailIdFormat(trimmedEmailId);
    if (!isValid) {
      setValidationError(error || null);
      return;
    }
    setValidationError(null);

    const timeoutId = setTimeout(async () => {
      setIsChecking(true);
      try {
        const available = await checkEmailIdAvailable(trimmedEmailId);
        setIsAvailable(available);
        if (!available) {
          setCheckError("This pet email is already taken");
        }
      } catch {
        setCheckError("Failed to check availability. Please try again.");
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [emailId]);

  const canProceed = emailId.trim() && isAvailable && !validationError && !isChecking;

  const handleContinue = useCallback(() => {
    const trimmedEmailId = emailId.trim().toLowerCase();
    if (!trimmedEmailId) {
      Alert.alert("Pet email", "Enter the part before @pawbuck.app to continue.");
      return;
    }
    if (validationError) {
      Alert.alert("Pet email", validationError);
      return;
    }
    if (isChecking) {
      Alert.alert("Pet email", "Still checking availability — try again in a moment.");
      return;
    }
    if (!isAvailable) {
      Alert.alert("Pet email", checkError || "Choose an available pet email.");
      return;
    }
    updatePetData({ email_id: trimmedEmailId });
    router.push("/onboarding/step6");
  }, [emailId, isAvailable, validationError, isChecking, checkError, updatePetData, router]);

  const hasError = !!(validationError || checkError);

  const getBorderColor = () => {
    if (hasError) return "#EF4444";
    if (isAvailable) return "#22C55E";
    if (emailId.trim()) return accentColor;
    return isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  };

  const getStatusMessage = () => {
    if (validationError) return validationError;
    if (checkError) return checkError;
    if (isAvailable) return "This pet email is available!";
    return null;
  };

  const statusMessage = getStatusMessage();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header: back arrow + progress bar */}
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

      {/* Heading + subtitle above ScrollView */}
      <View style={styles.headingWrap}>
        <Text style={[styles.heading, { color: theme.foreground }]}>
          Choose pet email for {petName}
        </Text>
        <Text style={[styles.subtitle, { color: mutedText }]}>
          Records and updates are sent to <Text style={{ fontWeight: "600" }}>@pawbuck.app</Text> (your
          pet's inbox). Marketing and support may use @pawbuck.com — that's separate from this address.
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: 0, paddingBottom: 0, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
            flex: 1,
            backgroundColor: cardBg,
          }}
        >
          <Text style={[styles.label, { color: theme.foreground }]}>Pet email</Text>

          {/* Email input row */}
          <View style={[styles.emailRow, { backgroundColor: inputBg, borderColor: getBorderColor() }]}>
            <TextInput
              style={[styles.emailInput, { color: theme.foreground }]}
              placeholder="e.g., buddy, max123"
              placeholderTextColor={mutedText}
              value={emailId}
              onChangeText={(text) => setEmailId(text.toLowerCase())}
              autoCorrect={false}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
            <View style={styles.domainRow}>
              {isChecking && <ActivityIndicator size="small" color={accentColor} />}
              <Text style={[styles.domainText, { color: theme.foreground, opacity: 0.5 }]}>
                {EMAIL_DOMAIN}
              </Text>
            </View>
          </View>

          {/* Status message */}
          {statusMessage && (
            <Text
              style={[
                styles.statusText,
                { color: hasError ? "#EF4444" : "#22C55E" },
              ]}
            >
              {statusMessage}
            </Text>
          )}

          {/* CTA inside card */}
          <View style={[styles.ctaWrap, { paddingBottom: Math.max(24, insets.bottom) }]}>
            <CTA
              label="Continue"
              size="LG"
              style="Solid"
              state="Default"
              onPress={handleContinue}
              disabled={false}
              containerStyle={[styles.continueBtn, { opacity: canProceed ? 1 : 0.45 }]}
            />
          </View>
        </View>
      </ScrollView>
    </View>
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
    marginBottom: 32,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  emailInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  domainText: {
    fontSize: 15,
  },
  statusText: {
    fontSize: 13,
    marginTop: 4,
  },
  ctaWrap: {
    marginTop: "auto",
    paddingTop: 16,
  },
  continueBtn: {
    width: "100%",
    alignSelf: "stretch",
  },
});
