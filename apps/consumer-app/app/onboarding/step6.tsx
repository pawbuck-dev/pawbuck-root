import { CTA } from "@/components/ui";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Gender = "male" | "female";

const TOTAL_STEPS = 9;
const CURRENT_STEP = 6;

export default function OnboardingStep6() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData } = useOnboarding();
  const insets = useSafeAreaInsets();
  const isDark = mode === "dark";

  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);

  const progressPercent = (CURRENT_STEP / TOTAL_STEPS) * 100;
  const accentColor = isDark ? "#5FC4C0" : "#2BA89E";
  const mutedText = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const optionCardBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";

  const handleContinue = () => {
    if (selectedGender) {
      updatePetData({ sex: selectedGender });
      router.push("/onboarding/step7");
    }
  };

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

      {/* Heading above ScrollView */}
      <View style={styles.headingWrap}>
        <Text style={[styles.heading, { color: theme.foreground }]}>{`What's your pet's sex?`}</Text>
        <Text style={[styles.subtitle, { color: mutedText }]}>Tell us about your pet</Text>
      </View>

      {/* ScrollView with card container */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {/* Gender cards */}
          <View style={styles.cardsRow}>
            {/* Male */}
            <Pressable
              testID="onboarding-gender-male"
              onPress={() => setSelectedGender("male")}
              style={[
                styles.genderCard,
                {
                  backgroundColor: optionCardBg,
                  borderWidth: 2,
                  borderColor: selectedGender === "male" ? accentColor : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                },
              ]}
            >
              <MaterialCommunityIcons
                name="gender-male"
                size={64}
                color={selectedGender === "male" ? accentColor : theme.foreground}
                style={styles.genderIcon}
              />
              <Text style={[styles.cardLabel, { color: theme.foreground }]}>Male</Text>
            </Pressable>

            {/* Female */}
            <Pressable
              testID="onboarding-gender-female"
              onPress={() => setSelectedGender("female")}
              style={[
                styles.genderCard,
                {
                  backgroundColor: optionCardBg,
                  borderWidth: 2,
                  borderColor: selectedGender === "female" ? accentColor : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                },
              ]}
            >
              <MaterialCommunityIcons
                name="gender-female"
                size={64}
                color={selectedGender === "female" ? accentColor : theme.foreground}
                style={styles.genderIcon}
              />
              <Text style={[styles.cardLabel, { color: theme.foreground }]}>Female</Text>
            </Pressable>
          </View>

          {/* CTA inside card */}
          <View style={[styles.ctaWrap, { paddingBottom: Math.max(24, insets.bottom) }]}>
            <CTA
              label="Continue"
              size="LG"
              style="Solid"
              state={selectedGender ? "Default" : "Disable"}
              onPress={handleContinue}
              disabled={!selectedGender}
              containerStyle={styles.continueBtn}
              testID="onboarding-continue"
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 0,
    flexGrow: 1,
  },
  card: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 16,
  },
  genderCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  genderIcon: {
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: "600",
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
