import InitialWelcomeScreen from "@/components/InitialWelcomeScreen";
import SplashScreen from "@/components/SplashScreen";
import { useAuth } from "@/context/authContext";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";

export default function Index() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { isAuthenticated, loading } = useAuth();
  const { isOnboardingComplete } = useOnboarding();
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated && !isOnboardingComplete) {
      router.replace("/home");
    }
  }, [isAuthenticated, loading, router, isOnboardingComplete]);

  // Handle splash screen finish
  const handleSplashFinish = () => {
    setShowSplash(false);
    setShowWelcome(true);
  };

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <StatusBar style="light" />
        <SplashScreen onFinish={handleSplashFinish} />
      </View>
    );
  }

  // Don't render the welcome screen if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  // Show splash screen first
  if (showSplash) {
    return (
      <View className="flex-1">
        <StatusBar style="light" />
        <SplashScreen onFinish={handleSplashFinish} />
      </View>
    );
  }

  // Show initial welcome screen after splash
  return (
    <>
      <StatusBar style="light" />
      <InitialWelcomeScreen />
    </>
  );
}
