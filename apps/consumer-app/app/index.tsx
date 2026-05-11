import SplashScreen from "@/components/layout/SplashScreen";
import { useAuth } from "@/context/authContext";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (loading || !splashDone) return;
    if (isAuthenticated) {
      router.replace("/(home)/home");
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, loading, splashDone, router]);

  if (loading || !splashDone) {
    return (
      <View className="flex-1">
        <SplashScreen onFinish={() => setSplashDone(true)} />
      </View>
    );
  }

  return null;
}
