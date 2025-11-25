import { useTheme } from "@/context/themeContext";
import { useOnboarding } from "@/context/onboardingContext";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

type Gender = "male" | "female";

export default function OnboardingStep6() {
  const router = useRouter();
  const { theme, toggleTheme, mode } = useTheme();
  const { updatePetData, nextStep, petData } = useOnboarding();
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);

  const petName = petData.petName || "your pet";

  const handleSelectGender = (gender: Gender) => {
    setSelectedGender(gender);
    // Auto-advance after selection
    setTimeout(() => {
      updatePetData({ gender });
      nextStep();
      router.push("/onboarding/step7");
    }, 300);
  };

  const progressPercent = (5 / 8) * 100;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      {/* Header with Icons */}
      <View className="px-6 pt-14 pb-4">
        <View className="flex-row justify-between items-center mb-6">
          {/* Paw Icon */}
          <Pressable
            onPress={() => router.back()}
            className="w-12 h-12 items-center justify-center active:opacity-70"
          >
            <Ionicons name="paw" size={28} color={theme.primary} />
          </Pressable>

          {/* Theme Toggle */}
          <Pressable
            onPress={toggleTheme}
            className="w-12 h-12 items-center justify-center active:opacity-70"
          >
            <Ionicons
              name={mode === "dark" ? "sunny" : "moon"}
              size={24}
              color={mode === "dark" ? "#9CA3AF" : "#6B7280"}
            />
          </Pressable>
        </View>

        {/* Progress Indicator */}
        <View className="items-center mb-2">
          <Text
            className="text-base font-medium"
            style={{ color: theme.foreground }}
          >
            Question 5 of 8
          </Text>
        </View>

        {/* Progress Bar */}
        <View
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: theme.secondary }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: theme.primary,
            }}
          />
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 px-6 pt-8">
        {/* Back Button */}
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center mb-8 active:opacity-70"
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={theme.foreground}
            style={{ opacity: 0.7 }}
          />
          <Text
            className="text-base ml-1"
            style={{ color: theme.foreground, opacity: 0.7 }}
          >
            Back
          </Text>
        </Pressable>

        <View className="flex-1 items-center justify-center">
          <View className="w-full max-w-lg">
            {/* Question Heading */}
            <Text
              className="text-4xl font-bold text-center mb-4"
              style={{ color: theme.foreground }}
            >
              Male or Female?
            </Text>

            {/* Subtitle with pet name */}
            <Text
              className="text-base text-center mb-12"
              style={{ color: theme.foreground, opacity: 0.6 }}
            >
              Tell us about {petName}
            </Text>

            {/* Gender Selection Cards */}
            <View className="flex-row gap-4 justify-center">
              {/* Male Card */}
              <Pressable
                onPress={() => handleSelectGender("male")}
                className="flex-1 rounded-3xl py-8 items-center active:opacity-80"
                style={{
                  backgroundColor:
                    selectedGender === "male" ? theme.primary : theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  maxWidth: 180,
                }}
              >
                {/* Male Symbol */}
                <Text
                  className="text-6xl mb-4"
                  style={{
                    color:
                      selectedGender === "male"
                        ? theme.primaryForeground
                        : theme.foreground,
                  }}
                >
                  ♂
                </Text>

                {/* Label */}
                <Text
                  className="text-2xl font-semibold"
                  style={{
                    color:
                      selectedGender === "male"
                        ? theme.primaryForeground
                        : theme.foreground,
                  }}
                >
                  Male
                </Text>
              </Pressable>

              {/* Female Card */}
              <Pressable
                onPress={() => handleSelectGender("female")}
                className="flex-1 rounded-3xl py-8 items-center active:opacity-80"
                style={{
                  backgroundColor:
                    selectedGender === "female" ? theme.primary : theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  maxWidth: 180,
                }}
              >
                {/* Female Symbol */}
                <Text
                  className="text-6xl mb-4"
                  style={{
                    color:
                      selectedGender === "female"
                        ? theme.primaryForeground
                        : theme.foreground,
                  }}
                >
                  ♀
                </Text>

                {/* Label */}
                <Text
                  className="text-2xl font-semibold"
                  style={{
                    color:
                      selectedGender === "female"
                        ? theme.primaryForeground
                        : theme.foreground,
                  }}
                >
                  Female
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

