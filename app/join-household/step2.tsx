import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect } from "react";
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
import { useTheme } from "@/context/themeContext";
import { useAuth } from "@/context/authContext";

export default function JoinHouseholdStep2() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const isDarkMode = mode === "dark";
  const { inviteCode } = useLocalSearchParams<{ inviteCode: string }>();
  const [joining, setJoining] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated && inviteCode) {
      Alert.alert(
        "Authentication Required",
        "You need to sign in or create an account to join a household. Would you like to sign in now?",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => router.back(),
          },
          {
            text: "Sign In",
            onPress: () => {
              // Store invite code in params to resume after login
              router.replace({
                pathname: "/login",
                params: { returnTo: "/join-household/step2", inviteCode },
              });
            },
          },
        ]
      );
    }
  }, [isAuthenticated, authLoading, inviteCode, router]);

  const handleCancel = () => {
    router.back();
  };

  const handleJoinHousehold = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Authentication Required",
        "Please sign in or create an account to join the household."
      );
      return;
    }

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

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Don't render join UI if not authenticated (will redirect via useEffect)
  if (!isAuthenticated) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      {/* Top Navigation Bar */}
      <View className="px-6 pt-14 pb-4">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={handleCancel}
            className="flex-row items-center active:opacity-70"
          >
            <Ionicons name="close" size={24} color={theme.foreground} />
            <Text className="text-base ml-2" style={{ color: theme.foreground }}>
              Cancel
            </Text>
          </Pressable>
          <Text className="text-base" style={{ color: theme.foreground }}>
            Step 2 of 3
          </Text>
        </View>

        {/* Progress Bar */}
        <View
          className="w-full h-1 rounded-full"
          style={{ backgroundColor: isDarkMode ? "#1F1F1F" : theme.border }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: "66.66%",
              backgroundColor: theme.primary,
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
                    borderColor: theme.primary,
                    backgroundColor: theme.primary + "20",
                  }}
                >
                  <MaterialCommunityIcons
                    name="account-check"
                    size={40}
                    color={theme.primary}
                  />
                </View>
              </View>

              {/* Title */}
              <Text
                className="text-3xl font-bold text-center mb-4"
                style={{ color: theme.foreground }}
              >
                Confirm Join Request
              </Text>

              {/* Instructional Text */}
              <Text
                className="text-base text-center mb-8"
                style={{ color: theme.secondary }}
              >
                You&apos;re about to join this household. Once confirmed, you&apos;ll have access to all pets in this household.
              </Text>

              {/* Invite Code Display */}
              <View className="mb-8 rounded-xl p-4" style={{ backgroundColor: theme.card }}>
                <Text
                  className="text-sm mb-2"
                  style={{ color: theme.secondary }}
                >
                  Invite Code
                </Text>
                <Text
                  className="text-lg font-semibold"
                  style={{ color: theme.foreground }}
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
            backgroundColor: joining ? (isDarkMode ? "#374151" : theme.border) : theme.primary,
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

