import { CTA } from "@/components/ui";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PetType = "dog" | "cat";

const TOTAL_STEPS = 9;
const CURRENT_STEP = 2;

export default function OnboardingStep3() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData } = useOnboarding();
  const insets = useSafeAreaInsets();
  const isDark = mode === "dark";

  const [selectedPet, setSelectedPet] = useState<PetType | null>(null);

  const progressPercent = (CURRENT_STEP / TOTAL_STEPS) * 100;
  const accentColor = isDark ? "#5FC4C0" : "#2BA89E";
  const mutedText = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

  const handleContinue = () => {
    if (selectedPet) {
      updatePetData({ animal_type: selectedPet });
      router.push("/onboarding/step4");
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

      {/* Heading */}
      <View style={styles.headingWrap}>
        <Text style={[styles.heading, { color: theme.foreground }]}>
          What Kind Of Pet?
        </Text>
        <Text style={[styles.subtitle, { color: mutedText }]}>
          Select your pet type
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.cardContainer,
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
        {/* Pet Type Cards */}
        <View style={styles.cardsRow}>
          {/* Dog Card */}
          <Pressable
            onPress={() => setSelectedPet("dog")}
            style={[
              styles.petCard,
              {
                backgroundColor: cardBg,
                borderColor: selectedPet === "dog" ? accentColor : "transparent",
                borderWidth: selectedPet === "dog" ? 2 : 2,
              },
              selectedPet !== "dog" && { borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" },
            ]}
          >
            <Image
              source={require("@/assets/icons/dog.png")}
              style={styles.petImage}
              resizeMode="contain"
            />
            <Text style={[styles.cardLabel, { color: theme.foreground }]}>Dog</Text>
          </Pressable>

          {/* Cat Card */}
          <Pressable
            onPress={() => setSelectedPet("cat")}
            style={[
              styles.petCard,
              {
                backgroundColor: cardBg,
                borderColor: selectedPet === "cat" ? accentColor : "transparent",
                borderWidth: selectedPet === "cat" ? 2 : 2,
              },
              selectedPet !== "cat" && { borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" },
            ]}
          >
            <Image
              source={require("@/assets/icons/cat.png")}
              style={styles.petImage}
              resizeMode="contain"
            />
            <Text style={[styles.cardLabel, { color: theme.foreground }]}>Cat</Text>
          </Pressable>
        </View>

          {/* CTA */}
          <View style={[styles.ctaWrap, { paddingBottom: Math.max(24, insets.bottom) }]}>
            <CTA
              label="Continue"
              size="LG"
              style="Solid"
              state={selectedPet ? "Default" : "Disable"}
              onPress={handleContinue}
              disabled={!selectedPet}
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
  cardContainer: {},
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
  cardsRow: {
    flexDirection: "row",
    gap: 16,
  },
  petCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  petImage: {
    width: 80,
    height: 80,
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
