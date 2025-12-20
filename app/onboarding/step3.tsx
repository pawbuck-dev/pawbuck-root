import Header from "@/components/Header";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

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
                      : theme.dashedCard,
                }}
              >
                <Svg
                  width={48}
                  height={48}
                  viewBox="0 0 64 64"
                  fill={
                    selectedPet === "dog"
                      ? theme.primaryForeground
                      : theme.primary
                  }
                >
                  <Path d="M32 8c-8 0-14 4-18 10-2 3-4 7-4 11 0 2 0 4 1 6 1 3 3 5 5 7 3 2 6 3 10 3h12c4 0 7-1 10-3 2-2 4-4 5-7 1-2 1-4 1-6 0-4-2-8-4-11-4-6-10-10-18-10z" />
                  <Circle cx="23" cy="26" r="3" />
                  <Circle cx="41" cy="26" r="3" />
                  <Path d="M32 32c-3 0-5 1-7 3l2 2c1-1 3-2 5-2s4 1 5 2l2-2c-2-2-4-3-7-3z" />
                  <Path d="M16 14c-2-1-4-2-6-2-2 0-3 1-3 3 0 3 2 5 4 6l5-7z" />
                  <Path d="M48 14c2-1 4-2 6-2 2 0 3 1 3 3 0 3-2 5-4 6l-5-7z" />
                </Svg>
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
                      : theme.dashedCard,
                }}
              >
                <Svg
                  width={48}
                  height={48}
                  viewBox="0 0 64 64"
                  fill={
                    selectedPet === "cat"
                      ? theme.primaryForeground
                      : theme.primary
                  }
                >
                  <Path d="M14 8l-4 12c0 3 1 5 3 7l-1 8c0 3 2 5 5 5h30c3 0 5-2 5-5l-1-8c2-2 3-4 3-7l-4-12-8 4c-3-2-6-3-10-3s-7 1-10 3l-8-4z" />
                  <Circle cx="24" cy="26" r="2.5" />
                  <Circle cx="40" cy="26" r="2.5" />
                  <Path d="M26 32c0 1 1 2 2 2h8c1 0 2-1 2-2v-1h-12v1z" />
                </Svg>
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
