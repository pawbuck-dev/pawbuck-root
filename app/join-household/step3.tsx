import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function JoinHouseholdStep3() {
  const router = useRouter();
  const { inviteCode } = useLocalSearchParams<{ inviteCode: string }>();

  const handleContinue = () => {
    // Navigate to home screen
    router.dismissAll();
    router.replace("/(home)/home");
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#0A0A0A" }}>
      <StatusBar style="light" />

      {/* Top Navigation Bar */}
      <View className="px-6 pt-14 pb-4">
        <View className="flex-row items-center justify-between mb-4">
          <View style={{ width: 60 }} />
          <Text className="text-base" style={{ color: "#FFFFFF" }}>
            Step 3 of 3
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Progress Bar */}
        <View
          className="w-full h-1 rounded-full"
          style={{ backgroundColor: "#1F1F1F" }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: "100%",
              backgroundColor: "#5FC4C0",
            }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerClassName="flex-grow"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 items-center justify-center px-6 py-8">
          <View className="w-full max-w-md items-center">
            {/* Success Icon */}
            <View className="items-center mb-8">
              <View
                className="w-24 h-24 rounded-full items-center justify-center"
                style={{
                  backgroundColor: "rgba(95, 196, 192, 0.2)",
                }}
              >
                <MaterialCommunityIcons
                  name="check-circle"
                  size={60}
                  color="#5FC4C0"
                />
              </View>
            </View>

            {/* Title */}
            <Text
              className="text-3xl font-bold text-center mb-4"
              style={{ color: "#FFFFFF" }}
            >
              Successfully Joined!
            </Text>

            {/* Success Message */}
            <Text
              className="text-base text-center mb-8"
              style={{ color: "#9CA3AF" }}
            >
              You&apos;ve successfully joined the household. You now have access to all pets in this household.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View className="px-6 pb-8 pt-4">
        <Pressable
          onPress={handleContinue}
          className="w-full rounded-2xl py-5 items-center active:opacity-90"
          style={{
            backgroundColor: "#5FC4C0",
          }}
        >
          <Text
            className="text-lg font-semibold"
            style={{ color: "#FFFFFF" }}
          >
            Continue
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

