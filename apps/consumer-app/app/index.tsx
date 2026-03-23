import InitialWelcomeScreen from "@/components/onboarding/InitialWelcomeScreen";
import SplashScreen from "@/components/layout/SplashScreen";
import { useAuth } from "@/context/authContext";
import { useOnboarding } from "@/context/onboardingContext";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

export default function Index() {
  const router = useRouter();
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

  // Show loading screen while checking authentication (SplashScreen sets StatusBar by theme)
  if (loading) {
    return (
      <View className="flex-1">
        <SplashScreen onFinish={handleSplashFinish} />
      </View>
    );
  }

  // Don't render the welcome screen if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  // Show splash screen (Figma light 1386:41126 / dark 1340:30146)
  if (showSplash) {
    return (
      <View className="flex-1">
        <SplashScreen onFinish={handleSplashFinish} />
      </View>
    );
  }

  // Show initial welcome screen after splash (Figma 1340:31045 dark / 1386:42025 light)
  return <InitialWelcomeScreen />;
}
