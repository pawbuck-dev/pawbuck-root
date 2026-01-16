import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Back Button */}
      <View className="px-6 pt-14 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center active:opacity-70"
        >
          <Ionicons name="chevron-back" size={20} color="#9CA3AF" />
          <Text className="text-base ml-1" style={{ color: "#9CA3AF" }}>
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
              style={{ color: "#FFFFFF" }}
            >
              Welcome to PawBuck
            </Text>
            <Text
              className="text-lg text-center mb-2"
              style={{ color: "#9CA3AF" }}
            >
              How would you like to get started?
            </Text>
            <Text
              className="text-sm text-center"
              style={{ color: "#9CA3AF" }}
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
              style={{ backgroundColor: "#5FC4C0" }}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center mr-4"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-lg font-semibold mb-1"
                  style={{ color: "#FFFFFF" }}
                >
                  Register a New Pet
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: "#FFFFFF", opacity: 0.9 }}
                >
                  First time? Add your pet&apos;s profile
                </Text>
              </View>
            </Pressable>

            {/* HIDDEN: Join Your Pet's Circle - Uncomment to re-enable */}
            {/* <Pressable
              onPress={() => {
                router.push("/join-household");
              }}
              className="w-full rounded-2xl py-5 px-6 flex-row items-center active:opacity-90"
              style={{ backgroundColor: "#1F1F1F" }}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center mr-4"
                style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
              >
                <MaterialCommunityIcons
                  name="account-group"
                  size={24}
                  color="#5FC4C0"
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-lg font-semibold mb-1"
                  style={{ color: "#FFFFFF" }}
                >
                  Join Your Pet&apos;s Circle
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: "#9CA3AF" }}
                >
                  Access your family pets already registered
                </Text>
              </View>
            </Pressable> */}

            {/* HIDDEN: Transfer Pet Ownership - Uncomment to re-enable */}
            {/* <Pressable
              onPress={() => {
                router.push("/transfer-pet");
              }}
              className="w-full rounded-2xl py-5 px-6 flex-row items-center active:opacity-90"
              style={{ backgroundColor: "#1F1F1F" }}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center mr-4"
                style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
              >
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={24}
                  color="#5FC4C0"
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-lg font-semibold mb-1"
                  style={{ color: "#FFFFFF" }}
                >
                  Transfer Pet Ownership
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: "#9CA3AF" }}
                >
                  Receive a pet from another PawBuck user
                </Text>
              </View>
            </Pressable> */}
          </View>
        </View>
      </View>
    </View>
  );
}

