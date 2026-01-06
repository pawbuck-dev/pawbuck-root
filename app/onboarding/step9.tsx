import Header from "@/components/Header";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export default function OnboardingStep9() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData } = useOnboarding();
  const [microchipNumber, setMicrochipNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");

  const maxLength = 15;

  const handleNext = () => {
    // Only save microchip if it's exactly 15 digits or empty
    if (microchipNumber.trim() && microchipNumber.trim().length === maxLength) {
      updatePetData({ microchip_number: microchipNumber.trim() });
    }

    // Save passport number if provided
    if (passportNumber.trim()) {
      updatePetData({ passport_number: passportNumber.trim() });
    }

    // Navigate to review screen
    router.push("/onboarding/review");
  };

  const isValidMicrochip =
    microchipNumber.trim().length === 0 ||
    microchipNumber.trim().length === maxLength;
  const canProceed = isValidMicrochip;

  const progressPercent = 100; // Final question, 9/9 = 100%

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <Header />
      {/* Header with Icons */}
      <View className="px-6 pt-14 pb-4">
        {/* Progress Indicator */}
        <View className="items-center mb-2">
          <Text
            className="text-start font-medium"
            style={{ color: theme.foreground }}
          >
            Question 9 of 9
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
            className="text-start ml-1"
            style={{ color: theme.foreground, opacity: 0.7 }}
          >
            Back
          </Text>
        </Pressable>

        {/* Question Heading */}
        <Text
          className="text-4xl font-bold text-center mb-4"
          style={{ color: theme.foreground }}
        >
          Pet Identification
        </Text>

        {/* Subtitle */}
        <Text
          className="text-start text-center mb-12"
          style={{ color: theme.foreground, opacity: 0.6 }}
        >
          Both fields are optional
        </Text>

        {/* Form */}
        <View className="w-full max-w-lg mx-auto">
          {/* Microchip Label */}
          <Text
            className="text-start font-medium mb-3"
            style={{ color: theme.foreground }}
          >
            Microchip Number
          </Text>

          {/* Microchip Input with Character Count */}
          <View className="relative mb-6">
            <TextInput
              className="w-full rounded-xl py-4 px-5 text-start"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                color: theme.foreground,
                paddingRight: 60,
              }}
              placeholder="15-digit number (optional)"
              placeholderTextColor={mode === "dark" ? "#6B7280" : "#9CA3AF"}
              value={microchipNumber}
              onChangeText={(text) => {
                if (text.length <= maxLength) {
                  setMicrochipNumber(text);
                }
              }}
              keyboardType="numeric"
              maxLength={maxLength}
              returnKeyType="next"
            />
            {/* Character Counter */}
            <View className="absolute right-5 top-4">
              <Text
                className="text-sm"
                style={{ color: theme.secondary }}
              >
                {microchipNumber.length}/{maxLength}
              </Text>
            </View>
          </View>

          {/* Helper Text for Microchip */}
          <Text
            className="text-sm mb-8"
            style={{ color: theme.secondary }}
          >
            Usually found on vet records
          </Text>

          {/* Pet Passport Number Label */}
          <Text
            className="text-start font-medium mb-3"
            style={{ color: theme.foreground }}
          >
            Pet Passport Number
          </Text>

          {/* Pet Passport Input */}
          <View className="mb-6">
            <TextInput
              className="w-full rounded-xl py-4 px-5 text-start"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                color: theme.foreground,
              }}
              placeholder="e.g., US-2022-12345 (optional)"
              placeholderTextColor={mode === "dark" ? "#6B7280" : "#9CA3AF"}
              value={passportNumber}
              onChangeText={setPassportNumber}
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
          </View>

          {/* Helper Text for Passport */}
          <Text
            className="text-sm mb-8"
            style={{ color: theme.secondary }}
          >
            If you have an official pet passport
          </Text>

          {/* Next/Skip Button */}
          <Pressable
            onPress={handleNext}
            disabled={!canProceed}
            className="w-full rounded-2xl py-4 px-8 items-center active:opacity-80"
            style={{
              backgroundColor: canProceed ? theme.primary : theme.secondary,
              opacity: canProceed ? 1 : 0.5,
            }}
          >
            <Text
              className="text-lg font-semibold"
              style={{
                color: canProceed
                  ? theme.primaryForeground
                  : theme.secondaryForeground,
              }}
            >
              {microchipNumber.trim().length === 0 && passportNumber.trim().length === 0 ? "Skip" : "Next"}
            </Text>
          </Pressable>

          {/* Validation Message */}
          {microchipNumber.trim().length > 0 &&
            microchipNumber.trim().length < maxLength && (
              <Text
                className="text-sm text-center mt-3"
                style={{ color: "#EF4444" }}
              >
                Microchip number must be exactly 15 digits
              </Text>
            )}
        </View>
      </View>
    </View>
  );
}
