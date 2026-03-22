import { CTA } from "@/components/ui";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOTAL_STEPS = 9;
const CURRENT_STEP = 7;

export default function OnboardingStep7() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData, petData } = useOnboarding();
  const insets = useSafeAreaInsets();
  const isDark = mode === "dark";

  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const petName = petData?.name || "your pet";
  const progressPercent = (CURRENT_STEP / TOTAL_STEPS) * 100;
  const accentColor = isDark ? "#5FC4C0" : "#2BA89E";
  const mutedText = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";

  const formatDate = (date: Date) => {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const handleContinue = () => {
    if (birthDate) {
      updatePetData({ date_of_birth: birthDate.toISOString() });
      router.push("/onboarding/step8");
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
        <Text style={[styles.heading, { color: theme.foreground }]}>
          When Was {petName} Born?
        </Text>
        <Text style={[styles.subtitle, { color: mutedText }]}>
          Select their date of birth
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {/* Set Birthday label */}
          <Text style={[styles.label, { color: theme.foreground }]}>Set Birthday</Text>

          {/* Date trigger field */}
          <Pressable
            onPress={() => setPickerOpen((p) => !p)}
            style={[
              styles.dateTrigger,
              {
                backgroundColor: inputBg,
                borderColor: pickerOpen ? accentColor : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"),
                borderWidth: pickerOpen ? 1.5 : 1,
              },
            ]}
          >
            <Text style={[styles.dateText, { color: birthDate ? theme.foreground : mutedText }]}>
              {birthDate ? formatDate(birthDate) : "MM/DD/YYYY"}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={mutedText} />
          </Pressable>

          {/* Inline date picker */}
          {pickerOpen && (
            <View style={[styles.pickerWrap, { backgroundColor: inputBg }]}>
              <DateTimePicker
                value={birthDate || new Date(2024, 4, 24)}
                onChange={(_event, date) => {
                  if (date) setBirthDate(date);
                }}
                mode="date"
                maximumDate={new Date()}
                minimumDate={new Date(1990, 0, 1)}
                themeVariant={isDark ? "dark" : "light"}
                display="spinner"
                style={styles.picker}
              />
            </View>
          )}

          {/* CTA inside card */}
          <View style={[styles.ctaWrap, { paddingBottom: Math.max(24, insets.bottom) }]}>
            <CTA
              label="Continue"
              size="LG"
              style="Solid"
              state={birthDate ? "Default" : "Disable"}
              onPress={handleContinue}
              disabled={!birthDate}
              containerStyle={styles.continueBtn}
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
  heading: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  dateTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 15,
  },
  pickerWrap: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
    alignItems: "center",
  },
  picker: {
    height: 200,
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
