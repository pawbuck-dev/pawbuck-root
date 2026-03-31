import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, Pressable, Text, View } from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const primaryWell = isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.35)";

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {/* Back Button */}
      <View className="px-6 pt-14 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center active:opacity-70"
        >
          <Ionicons name="chevron-back" size={20} color={theme.secondary} />
          <Text className="text-base ml-1" style={{ color: theme.secondary }}>
            Back
          </Text>
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-lg items-center">
          {/* Logo */}
          <Image
            source={require("@/assets/images/icon.png")}
            style={{ width: 100, height: 100, marginBottom: 32 }}
            resizeMode="contain"
          />

          {/* Welcome Message */}
          <View className="mb-12 items-center">
            <Text
              className="text-4xl font-bold text-center mb-4"
              style={{ color: theme.foreground }}
            >
              Welcome to PawBuck
            </Text>
            <Text
              className="text-lg text-center mb-2"
              style={{ color: theme.secondary }}
            >
              How would you like to get started?
            </Text>
            <Text
              className="text-sm text-center"
              style={{ color: theme.secondary }}
            >
              Choose an option below
            </Text>
          </View>

          {/* Action Options */}
          <View className="w-full gap-4 mb-8">
            {/* Register a New Pet */}
            <Pressable
              onPress={() => router.push("/onboarding/step2")}
              className="w-full rounded-2xl py-5 px-6 flex-row items-center active:opacity-90"
              style={{ backgroundColor: theme.primary }}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center mr-4"
                style={{ backgroundColor: primaryWell }}
              >
                <Ionicons name="add" size={24} color={theme.primaryForeground} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-lg font-semibold mb-1"
                  style={{ color: theme.primaryForeground }}
                >
                  Register a New Pet
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: theme.primaryForeground, opacity: 0.9 }}
                >
                  First time? Add your pet&apos;s profile
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                router.push("/join-household");
              }}
              className="w-full rounded-2xl py-5 px-6 flex-row items-center active:opacity-90"
              style={{ backgroundColor: theme.card }}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center mr-4"
                style={{ backgroundColor: `${theme.primary}33` }}
              >
                <MaterialCommunityIcons
                  name="account-group"
                  size={24}
                  color={theme.primary}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-lg font-semibold mb-1"
                  style={{ color: theme.foreground }}
                >
                  Join Your Pet&apos;s Circle
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: theme.secondary }}
                >
                  Access your family pets already registered
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                router.push("/transfer-pet");
              }}
              className="w-full rounded-2xl py-5 px-6 flex-row items-center active:opacity-90"
              style={{ backgroundColor: theme.card }}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center mr-4"
                style={{ backgroundColor: `${theme.primary}33` }}
              >
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={24}
                  color={theme.primary}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-lg font-semibold mb-1"
                  style={{ color: theme.foreground }}
                >
                  Transfer Pet Ownership
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: theme.secondary }}
                >
                  Receive a pet from another PawBuck user
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
