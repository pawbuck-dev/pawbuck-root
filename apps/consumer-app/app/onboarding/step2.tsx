import CountryPicker from "@/components/CountryPicker";
import Header from "@/components/Header";
import { COUNTRY_FLAGS } from "@/constants/onboarding";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function OnboardingStep2() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData } = useOnboarding();
  const [country, setCountry] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const handleNext = () => {
    if (country) {
      updatePetData({ country });
      router.push("/onboarding/step3");
    }
  };

  const progressPercent = (1 / 9) * 100;

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
            Question 1 of 9
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
      <ScrollView className="flex-1 px-6">
        <View className="flex-1 justify-center py-8">
          {/* Question Heading */}
          <Text
            className="text-4xl font-bold text-center mb-4"
            style={{ color: theme.foreground }}
          >
            Where are you located?
          </Text>

          {/* Subtitle */}
          <Text
            className="text-start text-center mb-12"
            style={{ color: theme.foreground, opacity: 0.6 }}
          >
            This helps us check vaccine requirements for your area
          </Text>

          {/* Form */}
          <View className="w-full max-w-lg mx-auto">
            {/* Country Label */}
            <Text
              className="text-start font-medium mb-3"
              style={{ color: theme.foreground }}
            >
              Country
            </Text>

            {/* Country Dropdown/Picker */}
            <Pressable
              onPress={() => setShowCountryPicker(true)}
              className="w-full bg-transparent rounded-xl py-4 px-5 mb-8"
              style={{ borderWidth: 1, borderColor: theme.border }}
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center flex-1">
                  {country && COUNTRY_FLAGS[country] && (
                    <Text className="text-xl mr-3">
                      {COUNTRY_FLAGS[country]}
                    </Text>
                  )}
                  <Text
                    className="text-start"
                    style={{
                      color: country ? theme.foreground : theme.foreground,
                      opacity: country ? 1 : 0.5,
                    }}
                  >
                    {country || "Select your country..."}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={mode === "dark" ? "#9CA3AF" : "#6B7280"}
                />
              </View>
            </Pressable>

            {/* Country Picker Modal */}
            <CountryPicker
              visible={showCountryPicker}
              selectedCountry={country}
              onSelect={setCountry}
              onClose={() => setShowCountryPicker(false)}
            />

            {/* Next Button */}
            <Pressable
              onPress={handleNext}
              disabled={!country}
              className="w-full rounded-2xl py-4 px-8 items-center active:opacity-80"
              style={{
                backgroundColor: country ? theme.primary : theme.secondary,
                opacity: country ? 1 : 0.5,
              }}
            >
              <Text
                className="text-lg font-semibold"
                style={{
                  color: country
                    ? theme.primaryForeground
                    : theme.secondaryForeground,
                }}
              >
                Next
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
