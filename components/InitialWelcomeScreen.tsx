import { useRouter } from "expo-router";
import { Image, Text, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";

export default function InitialWelcomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: "#0A0A0A" }}>
      <View className="w-full max-w-md items-center">
        {/* Logo */}
        <Image
          source={require("@/assets/images/icon.png")}
          style={{ width: 120, height: 120, marginBottom: 48 }}
          resizeMode="contain"
        />

        {/* Welcome Message */}
        <View className="mb-12 items-center">
          <Text
            className="text-4xl font-bold text-center mb-4"
            style={{ color: "#FFFFFF" }}
          >
            Welcome to PawBuck
          </Text>
          <Text
            className="text-lg text-center"
            style={{ color: "#9CA3AF" }}
          >
            Your pet&apos;s health, all in one place
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="w-full gap-4">
          {/* Sign Up Button */}
          <Pressable
            onPress={() => router.push("/welcome")}
            style={{
              backgroundColor: "#5FC4C0",
              borderRadius: 16,
              paddingVertical: 20,
              paddingHorizontal: 24,
              alignItems: "center",
              width: "100%",
            }}
          >
            <Text
              className="text-lg font-semibold mb-1"
              style={{ color: "#FFFFFF" }}
            >
              Sign Up
            </Text>
            <Text
              className="text-sm"
              style={{ color: "#FFFFFF", opacity: 0.9 }}
            >
              Create your PawBuck account
            </Text>
          </Pressable>

          {/* Sign In Button */}
          <Pressable
            onPress={() => router.push("/login")}
            style={{
              backgroundColor: "#1F1F1F",
              borderRadius: 16,
              paddingVertical: 20,
              paddingHorizontal: 24,
              alignItems: "center",
              width: "100%",
            }}
          >
            <Text
              className="text-lg font-semibold mb-1"
              style={{ color: "#FFFFFF" }}
            >
              Sign In
            </Text>
            <Text
              className="text-sm"
              style={{ color: "#FFFFFF", opacity: 0.9 }}
            >
              Welcome back
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

