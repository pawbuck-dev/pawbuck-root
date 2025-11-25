import { useTheme } from "@/context/themeContext";
import { useOnboarding } from "@/context/onboardingContext";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function OnboardingStep7() {
  const router = useRouter();
  const { theme, toggleTheme, mode } = useTheme();
  const { updatePetData, nextStep, petData } = useOnboarding();
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const petName = petData.petName || "your pet";

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleNext = () => {
    if (birthDate) {
      updatePetData({ birthDate: birthDate.toISOString() });
      nextStep();
      router.push("/onboarding/step8");
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const progressPercent = (6 / 8) * 100;

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
            Question 6 of 8
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
          className="text-4xl font-bold text-center mb-4"
          style={{ color: theme.foreground }}
        >
          When was {petName} born?
        </Text>

        {/* Subtitle */}
        <Text
          className="text-base text-center mb-12"
          style={{ color: theme.foreground, opacity: 0.6 }}
        >
          Select their date of birth
        </Text>

        {/* Form */}
        <View className="w-full max-w-lg mx-auto">
          {/* Date Picker Button */}
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="w-full rounded-xl py-4 px-5 mb-8 flex-row items-center"
            style={{
              backgroundColor: theme.background,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={mode === "dark" ? "#9CA3AF" : "#6B7280"}
              style={{ marginRight: 12 }}
            />
            <Text
              className="text-base flex-1"
              style={{
                color: birthDate ? theme.foreground : theme.foreground,
                opacity: birthDate ? 1 : 0.5,
              }}
            >
              {birthDate ? formatDate(birthDate) : "Pick a date"}
            </Text>
          </Pressable>

          {/* Date Picker */}
          {showDatePicker && (
            <View className="mb-8">
              <DateTimePicker
                value={birthDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1990, 0, 1)}
                themeVariant={mode}
              />
              {Platform.OS === "ios" && (
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  className="w-full rounded-xl py-3 items-center mt-4"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text
                    className="text-base font-semibold"
                    style={{ color: theme.primaryForeground }}
                  >
                    Done
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Next Button */}
          <Pressable
            onPress={handleNext}
            disabled={!birthDate}
            className="w-full rounded-2xl py-4 px-8 items-center active:opacity-80"
            style={{
              backgroundColor: birthDate ? theme.primary : theme.secondary,
              opacity: birthDate ? 1 : 0.5,
            }}
          >
            <Text
              className="text-lg font-semibold"
              style={{
                color: birthDate
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

