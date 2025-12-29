import { useAuth } from "@/context/authContext";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function Index() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { isAuthenticated, loading } = useAuth();
  const { isOnboardingComplete } = useOnboarding();

  // Redirect to home if already authenticated
  // Skip if onboarding is complete - let signup/login handle navigation after pet creation
  useEffect(() => {
    if (!loading && isAuthenticated && !isOnboardingComplete) {
      router.replace("/home");
    }
  }, [isAuthenticated, loading, router, isOnboardingComplete]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator size="large" color="#5FC4C0" />
        <Text className="mt-4 text-lg" style={{ color: theme.foreground }}>
          Loading...
        </Text>
      </View>
    );
  }

  // Don't render the welcome screen if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <GestureHandlerRootView
      className="flex-1"
      style={{ backgroundColor: theme.background }}
    >
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      {/* Gradient Background - using native gradients would require expo-linear-gradient */}
      <View className={`flex-1 items-center justify-center px-6`}>
        {/* Main Content Container */}
        <View className={`w-full max-w-lg items-center`}>
          {/* Logo */}
          <Image
            source={require("@/assets/images/icon.png")}
            style={{ width: 100, height: 100, marginBottom: 24 }}
            resizeMode="contain"
          />

          {/* Headline */}
          <View className="mb-12 items-center">
            <Text
              className="text-4xl font-bold text-center mb-4"
              style={{ color: theme.foreground }}
            >
              Welcome to PawBuck
            </Text>
            <Text
              className="text-lg text-center"
              style={{ color: theme.foreground, opacity: 0.9 }}
            >
              Your pet&apos;s health, simplified
            </Text>
          </View>
          {/* CTA Buttons */}
          <View className="w-full max-w-xs gap-4">
            <Pressable
              onPress={() => router.push("/onboarding/step1")}
              // onPress={() => router.push("/signup")}
              className="w-full rounded-2xl py-4 px-8 items-center active:opacity-80"
              style={{ backgroundColor: theme.primary }}
            >
              <Text
                className="text-lg font-semibold"
                style={{ color: theme.primaryForeground }}
              >
                Get Started
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/login")}
              className="w-full bg-transparent rounded-2xl py-4 px-8 items-center active:opacity-80"
              style={{ borderWidth: 2, borderColor: theme.foreground }}
            >
              <Text
                className="text-lg font-semibold"
                style={{ color: theme.foreground }}
              >
                I Already Have an Account
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
