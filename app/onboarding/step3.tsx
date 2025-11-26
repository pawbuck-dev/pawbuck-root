import Header from "@/components/Header";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

type PetType = "dog" | "cat";

export default function OnboardingStep3() {
  const router = useRouter();
  const { theme } = useTheme();
  const { updatePetData } = useOnboarding();
  const [selectedPet, setSelectedPet] = useState<PetType | null>(null);

  const handleSelectPet = (petType: PetType) => {
    setSelectedPet(petType);
    // Auto-advance after selection
    setTimeout(() => {
      updatePetData({ animal_type: petType });
      router.push("/onboarding/step4");
    }, 300);
  };

  const progressPercent = (2 / 8) * 100;

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
            Question 2 of 8
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
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-lg">
          {/* Question Heading */}
          <Text
            className="text-4xl font-bold text-center mb-12"
            style={{ color: theme.foreground }}
          >
            What animal is your pet?
          </Text>

          {/* Pet Type Cards */}
          <View className="flex-row gap-4 justify-center">
            {/* Dog Card */}
            <Pressable
              onPress={() => handleSelectPet("dog")}
              className="flex-1 rounded-3xl py-8 items-center active:opacity-80"
              style={{
                backgroundColor:
                  selectedPet === "dog" ? theme.primary : theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                maxWidth: 180,
              }}
            >
              {/* Icon Circle */}
              <View
                className="w-24 h-24 rounded-full items-center justify-center mb-4"
                style={{
                  backgroundColor:
                    selectedPet === "dog"
                      ? "rgba(255, 255, 255, 0.2)"
                      : theme.secondary,
                }}
              >
                <Ionicons
                  name="paw"
                  size={40}
                  color={
                    selectedPet === "dog"
                      ? theme.primaryForeground
                      : theme.primary
                  }
                />
              </View>

              {/* Label */}
              <Text
                className="text-2xl font-semibold"
                style={{
                  color:
                    selectedPet === "dog"
                      ? theme.primaryForeground
                      : theme.foreground,
                }}
              >
                Dog
              </Text>
            </Pressable>

            {/* Cat Card */}
            <Pressable
              onPress={() => handleSelectPet("cat")}
              className="flex-1 rounded-3xl py-8 items-center active:opacity-80"
              style={{
                backgroundColor:
                  selectedPet === "cat" ? theme.primary : theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                maxWidth: 180,
              }}
            >
              {/* Icon Circle */}
              <View
                className="w-24 h-24 rounded-full items-center justify-center mb-4"
                style={{
                  backgroundColor:
                    selectedPet === "cat"
                      ? "rgba(255, 255, 255, 0.2)"
                      : theme.secondary,
                }}
              >
                <Ionicons
                  name="paw"
                  size={40}
                  color={
                    selectedPet === "cat"
                      ? theme.primaryForeground
                      : theme.primary
                  }
                />
              </View>

              {/* Label */}
              <Text
                className="text-2xl font-semibold"
                style={{
                  color:
                    selectedPet === "cat"
                      ? theme.primaryForeground
                      : theme.foreground,
                }}
              >
                Cat
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
