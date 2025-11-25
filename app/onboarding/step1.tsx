import Header from "@/components/Header";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function OnboardingStep1() {
  const router = useRouter();
  const { theme } = useTheme();
  const { goToStep } = useOnboarding();

  const handleLetsGo = () => {
    goToStep(2);
    router.push("/onboarding/step2");
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <Header />

      {/* Main Content */}
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-lg items-center">
          {/* Heading */}
          <Text
            className="text-4xl font-bold text-center mb-6"
            style={{ color: theme.foreground }}
          >
            Let's register your pet
          </Text>

          {/* Subtitle */}
          <Text
            className="text-lg text-center mb-12 leading-7"
            style={{ color: theme.foreground, opacity: 0.6 }}
          >
            We'll ask you 8 quick questions to create your pet's health profile
          </Text>

          {/* Let's Go Button */}
          <Pressable
            onPress={handleLetsGo}
            className="rounded-2xl py-4 px-16 items-center active:opacity-80 shadow-lg"
            style={{ backgroundColor: theme.primary }}
          >
            <Text
              className="text-lg font-semibold"
              style={{ color: theme.primaryForeground }}
            >
              Let's Go
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
