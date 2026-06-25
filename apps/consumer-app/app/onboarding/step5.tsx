import { CTA } from "@/components/ui";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOTAL_STEPS = 9;
const CURRENT_STEP = 4;

export default function OnboardingStep5() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData } = useOnboarding();
  const insets = useSafeAreaInsets();
  const isDark = mode === "dark";

  const [petName, setPetName] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const progressPercent = (CURRENT_STEP / TOTAL_STEPS) * 100;
  const accentColor = isDark ? "#5FC4C0" : "#2BA89E";
  const mutedText = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleContinue = () => {
    if (petName.trim()) {
      updatePetData({ name: petName.trim(), ...(photoUri ? { photo_url: photoUri } : {}) });
      router.push("/onboarding/step5b");
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

      {/* Heading + subtitle above ScrollView */}
      <View style={styles.headingWrap}>
        <Text style={[styles.heading, { color: theme.foreground }]}>{`What's your pet's name?`}</Text>
        <Text style={[styles.subtitle, { color: mutedText }]}>
          Personalize your pet's care experience
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
          {/* Photo picker */}
          <Pressable onPress={handlePickPhoto} style={styles.photoSection}>
            <View style={[styles.photoCircle, { backgroundColor: inputBg, borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)" }]}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImage} />
              ) : (
                <Ionicons name="camera-outline" size={32} color={mutedText} />
              )}
            </View>
            <Text style={[styles.addPhotoText, { color: mutedText }]}>Add Photo</Text>
          </Pressable>

          {/* Pet Name label */}
          <Text style={[styles.label, { color: theme.foreground }]}>Pet name</Text>

          {/* Pet Name input */}
          <TextInput
            testID="onboarding-pet-name-input"
            style={[styles.input, { backgroundColor: inputBg, color: theme.foreground, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]}
            placeholder="e.g., Max, Luna"
            placeholderTextColor={mutedText}
            value={petName}
            onChangeText={setPetName}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />

          {/* CTA inside card */}
          <View style={[styles.ctaWrap, { paddingBottom: Math.max(24, insets.bottom) }]}>
            <CTA
              label="Continue"
              size="LG"
              style="Solid"
              state={petName.trim() ? "Default" : "Disable"}
              onPress={handleContinue}
              disabled={!petName.trim()}
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
    marginBottom: 28,
  },
  photoSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  photoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  addPhotoText: {
    fontSize: 14,
    marginTop: 8,
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
  ctaWrap: {
    marginTop: "auto",
    paddingTop: 16,
  },
  continueBtn: {
    width: "100%",
    alignSelf: "stretch",
  },
});
