import { CTA } from "@/components/ui";
import { CAT_BREEDS, DOG_BREEDS } from "@/constants/onboarding";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOTAL_STEPS = 9;
const CURRENT_STEP = 3;

export default function OnboardingStep4() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData, petData } = useOnboarding();
  const insets = useSafeAreaInsets();
  const isDark = mode === "dark";

  const [breed, setBreed] = useState("");
  const [breedSearchQuery, setBreedSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const petType = (petData?.animal_type || "dog") as "dog" | "cat" | "other";
  const petLabel = petType === "cat" ? "Cat" : "Dog";
  const breeds = petType === "cat" ? CAT_BREEDS : DOG_BREEDS;

  const filteredBreeds = useMemo(
    () =>
      breeds.filter((item) =>
        item.toLowerCase().includes(breedSearchQuery.trim().toLowerCase())
      ),
    [breeds, breedSearchQuery]
  );

  const progressPercent = (CURRENT_STEP / TOTAL_STEPS) * 100;
  const accentColor = isDark ? "#5FC4C0" : "#2BA89E";
  const mutedText = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

  const handleBreedSelect = (selectedBreed: string) => {
    setBreed(selectedBreed);
    setBreedSearchQuery("");
    setDropdownOpen(false);
  };

  /** Use typed search as breed when it is not in the catalog (custom / crossbreed). */
  const applySearchAsCustomBreed = () => {
    const q = breedSearchQuery.trim();
    if (!q) return;
    setBreed(q);
    setBreedSearchQuery("");
    setDropdownOpen(false);
  };

  const openCustomBreedScreen = () => {
    const q = breedSearchQuery.trim();
    if (!breed.trim() && q) {
      setBreed(q);
    }
    setBreedSearchQuery("");
    setDropdownOpen(false);
    setShowCustomInput(true);
  };

  const handleContinue = () => {
    if (breed.trim()) {
      updatePetData({ breed: breed.trim() });
      router.push("/onboarding/step5");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
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
              style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]}
            />
          </View>
        </View>
      </View>

      {/* Heading + Subtitle (fixed, not scrollable) */}
      <View style={styles.headingWrap}>
        <Text style={[styles.heading, { color: theme.foreground }]}>
          What breed is your {petLabel}?
        </Text>
        <Text style={[styles.subtitle, { color: mutedText }]}>
          Helps personalize care
        </Text>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!showCustomInput ? (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            {/* Select Breed label */}
            <Text style={[styles.label, { color: theme.foreground }]}>Select breed</Text>

            {/* Dropdown trigger */}
            <Pressable
              onPress={() => {
                setBreedSearchQuery("");
                setDropdownOpen((prev) => !prev);
              }}
              style={[
                styles.dropdownTrigger,
                {
                  backgroundColor: inputBg,
                  borderColor: dropdownOpen ? accentColor : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                  borderWidth: dropdownOpen ? 1.5 : 1,
                },
              ]}
            >
              <Text
                style={[styles.dropdownText, { color: breed ? theme.foreground : mutedText }]}
              >
                {breed || "Choose a breed..."}
              </Text>
              <Ionicons
                name={dropdownOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color={mutedText}
              />
            </Pressable>

            {/* Inline breed list + search (parity with BreedPicker on review screen) */}
            {dropdownOpen && (
              <View
                style={[
                  styles.breedList,
                  {
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.breedSearchRow,
                    {
                      backgroundColor: inputBg,
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                    },
                  ]}
                >
                  <Ionicons name="search" size={18} color={mutedText} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.breedSearchInput, { color: theme.foreground }]}
                    placeholder="Search breeds..."
                    placeholderTextColor={mutedText}
                    value={breedSearchQuery}
                    onChangeText={setBreedSearchQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                    accessibilityLabel="Search breeds"
                  />
                  {breedSearchQuery.length > 0 ? (
                    <Pressable onPress={() => setBreedSearchQuery("")} hitSlop={8}>
                      <Ionicons name="close-circle" size={20} color={mutedText} />
                    </Pressable>
                  ) : null}
                </View>

                <ScrollView
                  style={styles.breedListScroll}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  {filteredBreeds.length > 0 ? (
                    filteredBreeds.map((item) => {
                      const isSelected = breed === item;
                      return (
                        <Pressable
                          key={item}
                          onPress={() => handleBreedSelect(item)}
                          style={[
                            styles.breedRow,
                            isSelected && {
                              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.breedRowText,
                              { color: theme.foreground },
                              isSelected && { fontWeight: "600" },
                            ]}
                          >
                            {item}
                          </Text>
                          {isSelected ? (
                            <Ionicons name="checkmark-circle" size={22} color={accentColor} />
                          ) : null}
                        </Pressable>
                      );
                    })
                  ) : (
                    <View style={styles.breedEmptyBlock}>
                      <Text style={[styles.breedEmpty, { color: mutedText }]}>
                        {breedSearchQuery.trim()
                          ? `No breeds match "${breedSearchQuery.trim()}"`
                          : "Start typing to search, or add a custom breed below."}
                      </Text>
                      {breedSearchQuery.trim().length > 0 ? (
                        <Pressable
                          onPress={applySearchAsCustomBreed}
                          style={({ pressed }) => [
                            styles.useCustomBreedBtn,
                            {
                              borderColor: accentColor,
                              backgroundColor: pressed
                                ? isDark
                                  ? "rgba(95,196,192,0.12)"
                                  : "rgba(43,168,158,0.1)"
                                : "transparent",
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Use ${breedSearchQuery.trim()} as breed`}
                        >
                          <Ionicons name="create-outline" size={20} color={accentColor} />
                          <Text style={[styles.useCustomBreedBtnText, { color: accentColor }]}>
                            Use “{breedSearchQuery.trim()}” as breed
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  )}
                </ScrollView>

                {/* Always visible while dropdown is open — custom / crossbreed */}
                <Pressable
                  onPress={openCustomBreedScreen}
                  style={({ pressed }) => [
                    styles.customBreedLink,
                    pressed && { opacity: 0.85 },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel="Enter a custom breed name"
                >
                  <Ionicons name="add-circle-outline" size={20} color={accentColor} />
                  <Text style={[styles.customBreedText, { color: accentColor, fontWeight: "600" }]}>
                    {"Can't find your breed? Enter custom or crossbreed"}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={accentColor} />
                </Pressable>
              </View>
            )}

            {/* When dropdown closed — still offer custom breed */}
            {!dropdownOpen ? (
              <Pressable
                onPress={openCustomBreedScreen}
                style={({ pressed }) => [
                  styles.customBreedLink,
                  { marginTop: 16 },
                  pressed && { opacity: 0.85 },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={20} color={accentColor} />
                <Text style={[styles.customBreedText, { color: accentColor, fontWeight: "600" }]}>
                  {"Can't find your breed? Enter custom or crossbreed"}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={accentColor} />
              </Pressable>
            ) : null}

            {/* Continue button inside card */}
            <View style={[styles.ctaWrap, { paddingBottom: Math.max(24, insets.bottom) }]}>
              <CTA
                label="Continue"
                size="LG"
                style="Solid"
                state={breed.trim() ? "Default" : "Disable"}
                onPress={handleContinue}
                disabled={!breed.trim()}
                containerStyle={styles.continueBtn}
              />
            </View>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            {/* Custom breed input */}
            <Text style={[styles.label, { color: theme.foreground }]}>Enter breed name</Text>

            <TextInput
              style={[
                styles.dropdownTrigger,
                {
                  backgroundColor: inputBg,
                  borderColor: accentColor,
                  borderWidth: 1.5,
                  color: theme.foreground,
                },
              ]}
              placeholder="e.g., Labradoodle, Heinz 57, village mix"
              placeholderTextColor={mutedText}
              value={breed}
              onChangeText={setBreed}
              autoCorrect={false}
              autoCapitalize="words"
              autoFocus
            />

            {/* Back to dropdown link */}
            <Pressable onPress={() => setShowCustomInput(false)} style={styles.customBreedLink}>
              <Ionicons name="list-outline" size={18} color={accentColor} />
              <Text style={[styles.customBreedText, { color: accentColor }]}>
                Choose from common breeds
              </Text>
            </Pressable>

            {/* Continue button inside card */}
            <View style={[styles.ctaWrap, { paddingBottom: Math.max(24, insets.bottom) }]}>
              <CTA
                label="Continue"
                size="LG"
                style="Solid"
                state={breed.trim() ? "Default" : "Disable"}
                onPress={handleContinue}
                disabled={!breed.trim()}
                containerStyle={styles.continueBtn}
              />
            </View>
          </View>
        )}
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  dropdownTrigger: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownText: {
    fontSize: 15,
    flex: 1,
  },
  breedList: {
    marginTop: 8,
  },
  breedSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  breedSearchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  breedListScroll: {
    maxHeight: 320,
  },
  breedEmpty: {
    fontSize: 14,
    paddingVertical: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  breedEmptyBlock: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  useCustomBreedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  useCustomBreedBtnText: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "center",
  },
  breedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  breedRowText: {
    fontSize: 15,
    flex: 1,
  },
  customBreedLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
    flexWrap: "wrap",
  },
  customBreedText: {
    fontSize: 14,
    flex: 1,
    flexShrink: 1,
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
