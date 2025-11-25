import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text, View } from "react-native";

export default function OnboardingComplete() {
  const router = useRouter();
  const { theme, toggleTheme, mode } = useTheme();
  const { petData } = useOnboarding();

  const petName = petData.petName || "your pet";

  const handleContinueToSignUp = () => {
    // Navigate to sign up screen
    console.log("Navigate to sign up screen");
    // router.push("/auth/signup");
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      {/* Header */}
      <View className="px-6 pt-14 pb-4">
        <View className="flex-row justify-between items-center">
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
      </View>

      {/* Main Content */}
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-lg">
          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center mb-12 active:opacity-70"
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

          {/* Heading */}
          <Text
            className="text-4xl font-bold text-center mb-6"
            style={{ color: theme.foreground }}
          >
            Create your PawBuck account
          </Text>

          {/* Subtitle */}
          <Text
            className="text-lg text-center mb-12"
            style={{ color: theme.foreground, opacity: 0.6 }}
          >
            Sign up to save {petName}'s profile
          </Text>

          {/* Continue Button */}
          <Pressable
            onPress={handleContinueToSignUp}
            className="w-full rounded-2xl py-4 px-8 items-center active:opacity-80 mb-6"
            style={{ backgroundColor: theme.primary }}
          >
            <Text
              className="text-lg font-semibold"
              style={{ color: theme.primaryForeground }}
            >
              Continue to Sign Up
            </Text>
          </Pressable>

          {/* Privacy Notice */}
          <Text
            className="text-sm text-center"
            style={{ color: theme.foreground, opacity: 0.5 }}
          >
            Your pet data is secure and private
          </Text>
        </View>
      </View>
    </View>
  );
}

