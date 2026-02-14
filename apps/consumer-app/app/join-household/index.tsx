import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { verifyInviteCode } from "@/services/householdInvites";
import { useTheme } from "@/context/themeContext";

export default function JoinHousehold() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  const [inviteCode, setInviteCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    router.back();
  };

  const handleVerifyCode = async () => {
    if (!inviteCode.trim()) {
      setError("Please enter an invite code");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      // Verify the code first
      const invite = await verifyInviteCode(inviteCode.trim().toUpperCase());
      
      if (!invite) {
        setError("Invalid or expired invite code");
        setVerifying(false);
        return;
      }

      // Code is valid, proceed to step 2
      router.push({
        pathname: "/join-household/step2",
        params: { inviteCode: inviteCode.trim().toUpperCase() },
      });
    } catch (error: any) {
      setError(error.message || "Failed to verify invite code");
      setVerifying(false);
    }
  };

  const handleScanQRCode = () => {
    // TODO: Navigate to QR scanner screen
    // For now, show a message that QR scanning will be implemented
    Alert.alert(
      "QR Code Scanning",
      "QR code scanning will be available soon. Please enter the invite code manually."
    );
    // router.push("/join-household/scan");
  };

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
            Step 1 of 3
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
              width: "33.33%",
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
                    name="home"
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
                Join Your Household
              </Text>

              {/* Instructional Text */}
              <Text
                className="text-base text-center mb-8"
                style={{ color: theme.secondary }}
              >
                Enter the invite code you received from a family member.
              </Text>

              {/* Invite Code Input */}
              <View className="mb-4">
                <Text
                  className="text-base font-medium mb-2"
                  style={{ color: theme.foreground }}
                >
                  Invite Code
                </Text>
                <TextInput
                  value={inviteCode}
                  onChangeText={(text) => {
                    setInviteCode(text);
                    setError(null);
                  }}
                  placeholder="e.g., MTCH-2024-ABC123"
                  placeholderTextColor={theme.secondary}
                  autoCapitalize="characters"
                  className="w-full rounded-xl py-4 px-4 text-base"
                  style={{
                    backgroundColor: "transparent",
                    borderWidth: 1,
                    borderColor: error ? theme.error : (isDarkMode ? "#374151" : theme.border),
                    color: theme.foreground,
                  }}
                  editable={!verifying}
                />
                {error && (
                  <Text className="text-sm mt-2" style={{ color: theme.error }}>
                    {error}
                  </Text>
                )}
              </View>

              {/* Scan QR Code Option */}
              <Pressable
                onPress={handleScanQRCode}
                disabled={verifying}
                className="w-full rounded-xl py-4 px-4 mb-4 flex-row items-center justify-center active:opacity-70"
                style={{
                  backgroundColor: "transparent",
                  borderWidth: 1,
                  borderColor: isDarkMode ? "#374151" : theme.border,
                  borderStyle: "dashed",
                  opacity: verifying ? 0.5 : 1,
                }}
              >
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={20}
                  color={theme.foreground}
                />
                <Text className="text-base ml-2" style={{ color: theme.foreground }}>
                  Scan QR Code Instead
                </Text>
              </Pressable>

              {/* Hint Text */}
              <Text
                className="text-sm text-center mb-8"
                style={{ color: theme.secondary }}
              >
                Ask the household owner for an invite code or QR code to join.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Button */}
      <View className="px-6 pb-8 pt-4">
        <Pressable
          onPress={handleVerifyCode}
          disabled={!inviteCode.trim() || verifying}
          className="w-full rounded-2xl py-5 items-center active:opacity-90"
          style={{
            backgroundColor: inviteCode.trim() && !verifying ? theme.primary : (isDarkMode ? "#374151" : theme.border),
            opacity: (!inviteCode.trim() || verifying) ? 0.6 : 1,
          }}
        >
          {verifying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              className="text-lg font-semibold"
              style={{ color: "#FFFFFF" }}
            >
              Verify Code
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

