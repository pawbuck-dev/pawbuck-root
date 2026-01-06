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
import { verifyTransferCode, useTransferCode } from "@/services/petTransfers";
import { useTheme } from "@/context/themeContext";
import { useAuth } from "@/context/authContext";

export default function TransferPetStep2() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const isDarkMode = mode === "dark";
  const { transferCode } = useLocalSearchParams<{ transferCode: string }>();
  const [transferring, setTransferring] = useState(false);
  const [petName, setPetName] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated && transferCode) {
      Alert.alert(
        "Authentication Required",
        "You need to sign in or create an account to accept a pet transfer. Would you like to sign in now?",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => router.back(),
          },
          {
            text: "Sign In",
            onPress: () => {
              // Store transfer code in params to resume after login
              router.replace({
                pathname: "/login",
                params: { returnTo: "/transfer-pet/step2", transferCode },
              });
            },
          },
        ]
      );
    }
  }, [isAuthenticated, authLoading, transferCode, router]);

  useEffect(() => {
    // Fetch transfer details to show pet name (only if authenticated)
    const loadTransferDetails = async () => {
      if (transferCode && isAuthenticated) {
        try {
          const transfer = await verifyTransferCode(transferCode);
          if (transfer && (transfer as any).pets) {
            setPetName((transfer as any).pets.name);
          }
        } catch (error) {
          console.error("Error loading transfer details:", error);
        }
      }
    };
    loadTransferDetails();
  }, [transferCode, isAuthenticated]);

  const handleCancel = () => {
    router.back();
  };

  const handleTransferPet = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Authentication Required",
        "Please sign in or create an account to accept the transfer."
      );
      return;
    }

    if (!transferCode) {
      Alert.alert("Error", "Transfer code is missing");
      return;
    }

    setTransferring(true);

    try {
      await useTransferCode(transferCode);
      // Navigate to step 3 (success)
      router.replace({
        pathname: "/transfer-pet/step3",
        params: { transferCode },
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to transfer pet");
      setTransferring(false);
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

  // Don't render transfer UI if not authenticated (will redirect via useEffect)
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
              backgroundColor: "#FF9500",
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
                    borderColor: "#FF9500",
                    backgroundColor: "rgba(255, 149, 0, 0.1)",
                  }}
                >
                  <MaterialCommunityIcons
                    name="account-check"
                    size={40}
                    color="#FF9500"
                  />
                </View>
              </View>

              {/* Title */}
              <Text
                className="text-3xl font-bold text-center mb-4"
                style={{ color: theme.foreground }}
              >
                Confirm Transfer
              </Text>

              {/* Instructional Text */}
              <Text
                className="text-base text-center mb-8"
                style={{ color: theme.secondary }}
              >
                {petName
                  ? `You're about to receive ${petName} from the previous owner. Once confirmed, this pet will be added to your account.`
                  : "You're about to receive a pet from the previous owner. Once confirmed, this pet will be added to your account."}
              </Text>

              {/* Transfer Code Display */}
              <View className="mb-8 rounded-xl p-4" style={{ backgroundColor: theme.card }}>
                <Text
                  className="text-sm mb-2"
                  style={{ color: theme.secondary }}
                >
                  Transfer Code
                </Text>
                <Text
                  className="text-lg font-semibold"
                  style={{ color: theme.foreground }}
                >
                  {transferCode}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Button */}
      <View className="px-6 pb-8 pt-4">
        <Pressable
          onPress={handleTransferPet}
          disabled={transferring}
          className="w-full rounded-2xl py-5 items-center active:opacity-90"
          style={{
            backgroundColor: transferring ? (isDarkMode ? "#374151" : theme.border) : "#FF9500",
            opacity: transferring ? 0.6 : 1,
          }}
        >
          {transferring ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              className="text-lg font-semibold"
              style={{ color: "#FFFFFF" }}
            >
              Accept Transfer
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

