import { useTheme } from "@/context/themeContext";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, Pressable, Text, View } from "react-native";

export default function Index() {
  const router = useRouter();
  const { theme, mode } = useTheme();

  console.log(theme);
  

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      {/* Gradient Background - using native gradients would require expo-linear-gradient */}
      <View className={`flex-1 items-center justify-center px-6`}>
        {/* Main Content Container */}
        <View className={`w-full max-w-lg items-center`}>
          {/* Logo */}
          <View className="mb-8">
            <Image
              source={require("@/assets/images/pawbuck-logo.png")}
              className="w-36 h-36"
              resizeMode="contain"
            />
          </View>
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
              // onPress={() => router.push("/auth")}
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
    </View>
  );
}
