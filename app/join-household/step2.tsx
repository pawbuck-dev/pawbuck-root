import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useInviteCode } from "@/services/householdInvites";

export default function JoinHouseholdStep2() {
  const router = useRouter();
  const { inviteCode } = useLocalSearchParams<{ inviteCode: string }>();
  const [joining, setJoining] = useState(false);

  const handleCancel = () => {
    router.back();
  };

  const handleJoinHousehold = async () => {
    if (!inviteCode) {
      Alert.alert("Error", "Invite code is missing");
      return;
    }

    setJoining(true);

    try {
      await useInviteCode(inviteCode);
      // Navigate to step 3 (confirmation/success)
      router.replace({
        pathname: "/join-household/step3",
        params: { inviteCode },
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to join household");
      setJoining(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#0A0A0A" }}>
      <StatusBar style="light" />

      {/* Top Navigation Bar */}
      <View className="px-6 pt-14 pb-4">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={handleCancel}
            className="flex-row items-center active:opacity-70"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
            <Text className="text-base ml-2" style={{ color: "#FFFFFF" }}>
              Cancel
            </Text>
          </Pressable>
          <Text className="text-base" style={{ color: "#FFFFFF" }}>
            Step 2 of 3
          </Text>
        </View>

        {/* Progress Bar */}
        <View
          className="w-full h-1 rounded-full"
          style={{ backgroundColor: "#1F1F1F" }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: "66.66%",
              backgroundColor: "#5FC4C0",
            }}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 items-center justify-center px-6 py-8">
            <View className="w-full max-w-md">
              {/* Icon */}
              <View className="items-center mb-8">
                <View
                  className="w-20 h-20 rounded-full items-center justify-center"
                  style={{
                    borderWidth: 2,
                    borderColor: "#5FC4C0",
                    backgroundColor: "rgba(95, 196, 192, 0.1)",
                  }}
                >
                  <MaterialCommunityIcons
                    name="account-check"
                    size={40}
                    color="#5FC4C0"
                  />
                </View>
              </View>

              {/* Title */}
              <Text
                className="text-3xl font-bold text-center mb-4"
                style={{ color: "#FFFFFF" }}
              >
                Confirm Join Request
              </Text>

              {/* Instructional Text */}
              <Text
                className="text-base text-center mb-8"
                style={{ color: "#9CA3AF" }}
              >
                You&apos;re about to join this household. Once confirmed, you&apos;ll have access to all pets in this household.
              </Text>

              {/* Invite Code Display */}
              <View className="mb-8 rounded-xl p-4" style={{ backgroundColor: "#1F1F1F" }}>
                <Text
                  className="text-sm mb-2"
                  style={{ color: "#9CA3AF" }}
                >
                  Invite Code
                </Text>
                <Text
                  className="text-lg font-semibold"
                  style={{ color: "#FFFFFF" }}
                >
                  {inviteCode}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Button */}
      <View className="px-6 pb-8 pt-4">
        <Pressable
          onPress={handleJoinHousehold}
          disabled={joining}
          className="w-full rounded-2xl py-5 items-center active:opacity-90"
          style={{
            backgroundColor: joining ? "#374151" : "#5FC4C0",
            opacity: joining ? 0.6 : 1,
          }}
        >
          {joining ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              className="text-lg font-semibold"
              style={{ color: "#FFFFFF" }}
            >
              Join Household
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

