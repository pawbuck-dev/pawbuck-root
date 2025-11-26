import Header from "@/components/Header";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import DatePicker from "react-native-date-picker";

export default function OnboardingStep7() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData, petData } = useOnboarding();
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const petName = petData.name || "your pet";

  const handleNext = () => {
    if (birthDate) {
      updatePetData({ date_of_birth: birthDate.toISOString() });
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
      <Header />
      <View className="px-6 pt-14 pb-4">
        {/* Progress Indicator */}
        <View className="items-center mb-2">
          <Text
            className="text-start font-medium"
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
          When was {petName} born?
        </Text>

        {/* Subtitle */}
        <Text
          className="text-start text-center mb-12"
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
              className="text-start flex-1"
              style={{
                color: birthDate ? theme.foreground : theme.foreground,
                opacity: birthDate ? 1 : 0.5,
              }}
            >
              {birthDate ? formatDate(birthDate) : "Pick a date"}
            </Text>
          </Pressable>

          {/* Date Picker */}
          <DatePicker
            modal
            open={showDatePicker}
            theme={mode}
            mode="date"
            maximumDate={new Date()}
            minimumDate={new Date(1990, 0, 1)}
            date={birthDate || new Date()}
            onConfirm={(date) => {
              setShowDatePicker(false);
              setBirthDate(date);
            }}
            onCancel={() => {
              setShowDatePicker(false);
            }}
          />

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
