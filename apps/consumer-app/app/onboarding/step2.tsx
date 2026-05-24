import SearchableCountryModal from "@/components/common/SearchableCountryModal";
import { CTA } from "@/components/ui";
import { ONBOARDING_COUNTRY_OPTIONS } from "@/constants/onboardingCountries";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOTAL_STEPS = 9;
const CURRENT_STEP = 1;

export default function OnboardingStep2() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData } = useOnboarding();
  const insets = useSafeAreaInsets();
  const isDark = mode === "dark";

  const [country, setCountry] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const progressPercent = (CURRENT_STEP / TOTAL_STEPS) * 100;

  const flagForSelection = useMemo(
    () => ONBOARDING_COUNTRY_OPTIONS.find((c) => c.name === country)?.flag ?? "",
    [country]
  );

  const handleContinue = () => {
    if (country) {
      updatePetData({ country });
      router.push("/onboarding/step3");
    }
  };

  const accentColor = isDark ? "#5FC4C0" : "#2BA89E";
  const mutedText = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
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
        <Text style={[styles.heading, { color: theme.foreground }]}>Where are you located?</Text>
        <Text style={[styles.subtitle, { color: mutedText }]}>
          This helps us check vaccine requirements for your area accurately and quickly. Choose
          “Other” if your country isn’t listed — we won’t personalize vaccine checklists by region.
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
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 40,
              flex: 1,
              backgroundColor: cardBg,
            },
          ]}
        >
          <Text style={[styles.label, { color: theme.foreground }]}>Country</Text>

          <Pressable
            onPress={() => setModalOpen(true)}
            style={[
              styles.dropdownTrigger,
              {
                borderColor: theme.border,
                borderWidth: 1,
                backgroundColor: "transparent",
              },
            ]}
          >
            <View style={styles.dropdownTriggerInner}>
              {country ? (
                <Text style={[styles.dropdownText, { color: theme.foreground }]}>
                  {flagForSelection ? `${flagForSelection}  ` : ""}
                  {country}
                </Text>
              ) : (
                <Text style={[styles.dropdownText, { color: mutedText }]}>Select your country…</Text>
              )}
              <Ionicons name="chevron-forward" size={20} color={mutedText} />
            </View>
          </Pressable>

          <Text style={[styles.hint, { color: mutedText }]}>
            Search all available countries in the picker. Same list as profile settings.
          </Text>

          <View style={[styles.ctaWrap, { paddingBottom: Math.max(24, insets.bottom) }]}>
            <CTA
              label="Continue"
              size="LG"
              style="Solid"
              state={country ? "Default" : "Disable"}
              onPress={handleContinue}
              disabled={!country}
              containerStyle={styles.continueBtn}
            />
          </View>
        </View>
      </ScrollView>

      <SearchableCountryModal
        visible={modalOpen}
        countries={ONBOARDING_COUNTRY_OPTIONS}
        selectedCountry={country}
        onSelect={(name) => setCountry(name)}
        onClose={() => setModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  card: {},
  heading: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  hint: { fontSize: 13, lineHeight: 18, marginTop: 10 },
  label: { fontSize: 15, fontWeight: "600", marginBottom: 10 },
  dropdownTrigger: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 4 },
  dropdownTriggerInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dropdownText: { fontSize: 15, flex: 1 },
  ctaWrap: { marginTop: "auto", paddingTop: 16 },
  continueBtn: { width: "100%", alignSelf: "stretch" },
});
