import BreedPicker from "@/components/BreedPicker";
import Header from "@/components/Header";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export default function OnboardingStep4() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData, petData } = useOnboarding();
  const [breed, setBreed] = useState("");
  const [showBreedPicker, setShowBreedPicker] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const petType = (petData.animal_type || "dog") as "dog" | "cat" | "other";
  const petLabel = petType === "cat" ? "cat" : "dog";

  const handleNext = () => {
    if (breed.trim()) {
      updatePetData({ breed: breed.trim() });
      router.push("/onboarding/step5");
    }
  };

  const handleBreedSelect = (selectedBreed: string) => {
    setBreed(selectedBreed);
  };

  const progressPercent = (3 / 8) * 100;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* Header with Icons */}
      <Header />
      <View className="px-6 pt-14 pb-4">
        {/* Progress Indicator */}
        <View className="items-center mb-2">
          <Text
            className="text-start font-medium"
            style={{ color: theme.foreground }}
          >
            Question 3 of 8
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
          className="text-4xl font-bold text-center mb-12"
          style={{ color: theme.foreground }}
        >
          What breed is your {petLabel}?
        </Text>

        {/* Form */}
        <View className="w-full max-w-lg mx-auto">
          {!showCustomInput ? (
            <>
              {/* Breed Label */}
              <Text
                className="text-start font-medium mb-3"
                style={{ color: theme.foreground }}
              >
                Select breed
              </Text>

              {/* Breed Dropdown/Picker */}
              <Pressable
                onPress={() => setShowBreedPicker(true)}
                className="w-full bg-transparent rounded-xl py-4 px-5 mb-4"
                style={{ borderWidth: 1, borderColor: theme.border }}
              >
                <View className="flex-row justify-between items-center">
                  <Text
                    className="text-start"
                    style={{
                      color: breed ? theme.foreground : theme.foreground,
                      opacity: breed ? 1 : 0.5,
                    }}
                  >
                    {breed || "Choose a breed..."}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={mode === "dark" ? "#9CA3AF" : "#6B7280"}
                  />
                </View>
              </Pressable>

              {/* Can't find breed link */}
              <Pressable
                onPress={() => setShowCustomInput(true)}
                className="mb-8 active:opacity-70"
              >
                <Text
                  className="text-start text-center"
                  style={{ color: theme.primary }}
                >
                  Can't find your breed? Enter custom breed
                </Text>
              </Pressable>

              {/* Breed Picker Modal */}
              <BreedPicker
                visible={showBreedPicker}
                selectedBreed={breed}
                petType={petType}
                onSelect={handleBreedSelect}
                onClose={() => setShowBreedPicker(false)}
              />
            </>
          ) : (
            <>
              {/* Custom Breed Input */}
              <Text
                className="text-start font-medium mb-3"
                style={{ color: theme.foreground }}
              >
                Enter breed name
              </Text>

              <TextInput
                className="w-full rounded-xl py-4 px-5 mb-4 text-start"
                style={{
                  backgroundColor: theme.background,
                  borderWidth: 2,
                  borderColor: theme.primary,
                  color: theme.foreground,
                }}
                placeholder={`e.g., Mixed Breed, Labradoodle`}
                placeholderTextColor={mode === "dark" ? "#6B7280" : "#9CA3AF"}
                value={breed}
                onChangeText={setBreed}
                autoCorrect={false}
                autoCapitalize="words"
                autoFocus={true}
              />

              {/* Back to dropdown link */}
              <Pressable
                onPress={() => setShowCustomInput(false)}
                className="mb-8 active:opacity-70"
              >
                <Text
                  className="text-start text-center"
                  style={{ color: theme.primary }}
                >
                  Choose from common breeds
                </Text>
              </Pressable>
            </>
          )}

          {/* Next Button */}
          <Pressable
            onPress={handleNext}
            disabled={!breed.trim()}
            className="w-full rounded-2xl py-4 px-8 items-center active:opacity-80"
            style={{
              backgroundColor: breed.trim() ? theme.primary : theme.secondary,
              opacity: breed.trim() ? 1 : 0.5,
            }}
          >
            <Text
              className="text-lg font-semibold"
              style={{
                color: breed.trim()
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
