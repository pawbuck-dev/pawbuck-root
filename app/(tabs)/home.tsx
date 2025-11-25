import { useTheme } from "@/context/themeContext";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

export default function Home() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const [userEmail, setUserEmail] = useState<string | undefined>();

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email);
    };

    getUser();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Navigate back to welcome screen
      router.replace("/");
    } catch (error: any) {
      console.error("Error signing out:", error);
      Alert.alert("Error", error.message || "Failed to sign out");
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-md items-center">
          <Text
            className="text-4xl font-bold text-center mb-4"
            style={{ color: theme.foreground }}
          >
            Welcome Home! 🏠
          </Text>

          {userEmail && (
            <Text
              className="text-lg text-center mb-8"
              style={{ color: theme.foreground, opacity: 0.7 }}
            >
              Signed in as: {userEmail}
            </Text>
          )}

          <Text
            className="text-start text-center mb-8"
            style={{ color: theme.foreground, opacity: 0.6 }}
          >
            Your pet management dashboard is coming soon!
          </Text>

          <Pressable
            onPress={handleSignOut}
            className="w-full max-w-xs rounded-xl py-4 px-8 items-center active:opacity-80"
            style={{
              backgroundColor:
                mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
              borderWidth: 1,
              borderColor: theme.foreground + "40",
            }}
          >
            <Text
              className="text-start font-semibold"
              style={{ color: theme.foreground }}
            >
              Sign Out
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
