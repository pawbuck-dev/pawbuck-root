import { useTheme } from "@/context/themeContext";
import { useOnboarding } from "@/context/onboardingContext";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function OnboardingStep5() {
  const router = useRouter();
  const { theme, toggleTheme, mode } = useTheme();
  const { updatePetData, nextStep } = useOnboarding();
  const [petName, setPetName] = useState("");

  const handleNext = () => {
    if (petName.trim()) {
      updatePetData({ petName: petName.trim() });
      nextStep();
      router.push("/onboarding/step6");
    }
  };

  const progressPercent = (4 / 8) * 100;

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
            Question 4 of 8
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

        {/* Question Heading */}
        <Text
          className="text-4xl font-bold text-center mb-12"
          style={{ color: theme.foreground }}
        >
          What's your pet's name?
        </Text>

        {/* Form */}
        <View className="w-full max-w-lg mx-auto">
          {/* Name Label */}
          <Text
            className="text-base font-medium mb-3"
            style={{ color: theme.foreground }}
          >
            Name
          </Text>

          {/* Name Text Input */}
          <TextInput
            className="w-full rounded-xl py-4 px-5 mb-8 text-base"
            style={{
              backgroundColor: theme.background,
              borderWidth: 2,
              borderColor: theme.primary,
              color: theme.foreground,
            }}
            placeholder="e.g., Max, Luna"
            placeholderTextColor={mode === "dark" ? "#6B7280" : "#9CA3AF"}
            value={petName}
            onChangeText={setPetName}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={handleNext}
          />

          {/* Next Button */}
          <Pressable
            onPress={handleNext}
            disabled={!petName.trim()}
            className="w-full rounded-2xl py-4 px-8 items-center active:opacity-80"
            style={{
              backgroundColor: petName.trim()
                ? theme.primary
                : theme.secondary,
              opacity: petName.trim() ? 1 : 0.5,
            }}
          >
            <Text
              className="text-lg font-semibold"
              style={{
                color: petName.trim()
                  ? theme.primaryForeground
                  : theme.secondaryForeground,
              }}
            >
              Next
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

