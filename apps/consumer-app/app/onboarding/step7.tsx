import { CTA } from "@/components/ui";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOTAL_STEPS = 9;
const CURRENT_STEP = 7;

function defaultAdultPetBirthDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  d.setMonth(6, 1);
  return d;
}

export default function OnboardingStep7() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData, petData } = useOnboarding();
  const insets = useSafeAreaInsets();
  const isDark = mode === "dark";

  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [approxModalOpen, setApproxModalOpen] = useState(false);

  const petName = petData?.name || "your pet";
  const progressPercent = (CURRENT_STEP / TOTAL_STEPS) * 100;
  const accentColor = isDark ? "#5FC4C0" : "#2BA89E";
  const mutedText = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";

  const spinnerValue = birthDate ?? defaultAdultPetBirthDate();

  const approxYears = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 25 }, (_, i) => y - i - 1);
  }, []);

  const formatDate = (date: Date) => {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const goNext = useCallback(() => {
    router.push("/onboarding/step8");
  }, [router]);

  const handleContinue = () => {
    if (birthDate) {
      updatePetData({ date_of_birth: birthDate.toISOString() });
    }
    goNext();
  };

  const handleSkipUnknown = () => {
    goNext();
  };

  const pickApproxYear = (year: number) => {
    const d = new Date(year, 6, 1);
    setBirthDate(d);
    updatePetData({ date_of_birth: d.toISOString() });
    setApproxModalOpen(false);
    goNext();
  };

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
        <Text style={[styles.heading, { color: theme.foreground }]}>When was {petName} born?</Text>
        <Text style={[styles.subtitle, { color: mutedText }]}>
          Exact date helps age-based tips. Rescues can use approximate age or skip and add later in
          profile.
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.label, { color: theme.foreground }]}>Birthday</Text>

          <Pressable
            onPress={() => setPickerOpen((p) => !p)}
            style={[
              styles.dateTrigger,
              {
                backgroundColor: inputBg,
                borderColor: pickerOpen ? accentColor : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                borderWidth: pickerOpen ? 1.5 : 1,
              },
            ]}
          >
            <Text style={[styles.dateText, { color: birthDate ? theme.foreground : mutedText }]}>
              {birthDate ? formatDate(birthDate) : "MM/DD/YYYY"}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={mutedText} />
          </Pressable>

          {pickerOpen ? (
            <View style={[styles.pickerWrap, { backgroundColor: inputBg }]}>
              <DateTimePicker
                value={spinnerValue}
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
          ) : null}

          <Pressable
            onPress={() => setApproxModalOpen(true)}
            style={{ marginTop: 14, paddingVertical: 12 }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: accentColor }}>
              Use approximate age instead
            </Text>
          </Pressable>

          <View style={[styles.ctaWrap, { paddingBottom: Math.max(24, insets.bottom) }]}>
            <CTA
              label="Continue"
              size="LG"
              style="Solid"
              state={birthDate ? "Default" : "Disable"}
              onPress={handleContinue}
              disabled={!birthDate}
              containerStyle={styles.continueBtn}
              testID="onboarding-continue"
            />
            <Pressable
              testID="onboarding-skip-dob"
              onPress={handleSkipUnknown}
              style={{ marginTop: 12, paddingVertical: 12 }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: mutedText, textAlign: "center" }}>
                Skip for now
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal visible={approxModalOpen} animationType="fade" transparent>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setApproxModalOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalCard,
              { backgroundColor: theme.card, paddingBottom: Math.max(16, insets.bottom) },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.foreground }]}>Approximate birth year</Text>
            <Text style={[styles.modalSub, { color: mutedText }]}>
              We'll use July 1 of that year. You can refine it later in your pet's profile.
            </Text>
            <ScrollView style={{ maxHeight: 280 }} keyboardShouldPersistTaps="handled">
              {approxYears.map((year) => (
                <Pressable
                  key={year}
                  onPress={() => pickApproxYear(year)}
                  style={({ pressed }) => ({
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: pressed ? `${accentColor}22` : "transparent",
                  })}
                >
                  <Text style={{ fontSize: 16, color: theme.foreground }}>{year}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setApproxModalOpen(false)} style={{ marginTop: 8 }}>
              <Text style={{ textAlign: "center", color: mutedText, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  headingWrap: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 0, paddingBottom: 0, flexGrow: 1 },
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
  heading: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 15, fontWeight: "600", marginBottom: 10 },
  dateTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  dateText: { fontSize: 15 },
  pickerWrap: { borderRadius: 14, overflow: "hidden", marginTop: 8, alignItems: "center" },
  picker: { height: 200 },
  ctaWrap: { marginTop: "auto", paddingTop: 16 },
  continueBtn: { width: "100%", alignSelf: "stretch" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  modalSub: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
});
