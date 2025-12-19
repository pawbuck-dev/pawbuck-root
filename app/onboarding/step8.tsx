import Header from "@/components/Header";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

type WeightUnit = "pounds" | "kilograms";

export default function OnboardingStep8() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData, petData } = useOnboarding();
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<WeightUnit>("pounds");

  const petName = petData?.name || "your pet";

  const handleNext = () => {
    if (weight.trim() && !isNaN(parseFloat(weight))) {
      updatePetData({
        weight_value: parseFloat(weight),
        weight_unit: unit,
      });
      router.push("/onboarding/step9");
    }
  };

  const progressPercent = (7 / 8) * 100;

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1">
          <Header />
          <View className="px-6 pt-14 pb-4">
            {/* Progress Indicator */}
            <View className="items-center mb-2">
              <Text
                className="text-start font-medium"
                style={{ color: theme.foreground }}
              >
                Question 7 of 8
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
              How much does {petName} weigh?
            </Text>

            {/* Form */}
            <View className="w-full max-w-lg mx-auto">
              {/* Unit Toggle */}
              <View className="flex-row items-center justify-center mb-8">
                <View
                  className="flex-row rounded-full overflow-hidden"
                  style={{
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  {/* Pounds Button */}
                  <Pressable
                    onPress={() => setUnit("pounds")}
                    className="px-8 py-3 active:opacity-80"
                    style={{
                      backgroundColor:
                        unit === "pounds" ? theme.primary : "transparent",
                    }}
                  >
                    <Text
                      className="text-start font-semibold"
                      style={{
                        color:
                          unit === "pounds"
                            ? theme.primaryForeground
                            : theme.foreground,
                      }}
                    >
                      Pounds
                    </Text>
                  </Pressable>

                  {/* Kilograms Button */}
                  <Pressable
                    onPress={() => setUnit("kilograms")}
                    className="px-8 py-3 active:opacity-80"
                    style={{
                      backgroundColor:
                        unit === "kilograms" ? theme.primary : "transparent",
                    }}
                  >
                    <Text
                      className="text-start font-semibold"
                      style={{
                        color:
                          unit === "kilograms"
                            ? theme.primaryForeground
                            : theme.foreground,
                      }}
                    >
                      Kilograms
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Weight Label */}
              <Text
                className="text-start font-medium mb-3"
                style={{ color: theme.foreground }}
              >
                Weight in {unit}
              </Text>

              {/* Weight Input */}
              <TextInput
                className="w-full rounded-xl py-4 px-5 mb-8 text-start"
                style={{
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                  color: theme.foreground,
                }}
                placeholder="e.g., 45"
                placeholderTextColor={mode === "dark" ? "#6B7280" : "#9CA3AF"}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />

              {/* Next Button */}
              <Pressable
                onPress={handleNext}
                disabled={!weight.trim() || isNaN(parseFloat(weight))}
                className="w-full rounded-2xl py-4 px-8 items-center active:opacity-80"
                style={{
                  backgroundColor:
                    weight.trim() && !isNaN(parseFloat(weight))
                      ? theme.primary
                      : theme.secondary,
                  opacity: weight.trim() && !isNaN(parseFloat(weight)) ? 1 : 0.5,
                }}
              >
                <Text
                  className="text-lg font-semibold"
                  style={{
                    color:
                      weight.trim() && !isNaN(parseFloat(weight))
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
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
