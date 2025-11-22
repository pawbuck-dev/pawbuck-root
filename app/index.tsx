import { useTheme } from "@/context/themeContext";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, Pressable, Text, View } from "react-native";

export default function Index() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View className={`flex-1 bg-[${theme.background}]`}>
      <StatusBar style="auto" />

      {/* Gradient Background - using native gradients would require expo-linear-gradient */}
      <View className={`flex-1 items-center justify-center px-6`}>
        {/* Main Content Container */}
        <View className={`w-full max-w-lg items-center`}>
          {/* Logo */}
          <View className="mb-8">
            <Image
              source={require("@/assets/images/icon.png")}
              className="w-24 h-24"
              resizeMode="contain"
            />
          </View>
          {/* Headline */}
          <View className="mb-12 items-center">
            <Text className="text-4xl font-bold text-white text-center mb-4">
              Welcome to PawBuck
            </Text>
            <Text className="text-lg text-white/90 text-center">
              Your pet&apos;s health, simplified
            </Text>
          </View>
          {/* CTA Buttons */}
          <View className="w-full max-w-xs gap-4">
            <Pressable
              // onPress={() => router.push("/onboarding")}
              className="w-full bg-white rounded-xl py-4 px-8 items-center active:opacity-80"
            >
              <Text className="text-blue-600 text-lg font-semibold">
                Get Started
              </Text>
            </Pressable>

            <Pressable
              // onPress={() => router.push("/auth")}
              className="w-full bg-transparent border-2 border-white rounded-xl py-4 px-8 items-center active:opacity-80"
            >
              <Text className="text-white text-lg font-semibold">
                I Already Have an Account
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
