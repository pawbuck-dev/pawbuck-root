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
import { verifyTransferCode } from "@/services/petTransfers";
import { useTheme } from "@/context/themeContext";

export default function TransferPet() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  const [transferCode, setTransferCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    router.back();
  };

  const handleVerifyCode = async () => {
    if (!transferCode.trim()) {
      setError("Please enter a transfer code");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      // Verify the code first
      const transfer = await verifyTransferCode(transferCode.trim().toUpperCase());
      
      if (!transfer) {
        setError("Invalid or expired transfer code");
        setVerifying(false);
        return;
      }

      // Code is valid, proceed to step 2
      router.push({
        pathname: "/transfer-pet/step2",
        params: { transferCode: transferCode.trim().toUpperCase() },
      });
    } catch (error: any) {
      setError(error.message || "Failed to verify transfer code");
      setVerifying(false);
    }
  };

  const handleScanQRCode = () => {
    // TODO: Navigate to QR scanner screen
    Alert.alert(
      "QR Code Scanning",
      "QR code scanning will be available soon. Please enter the transfer code manually."
    );
    // router.push("/transfer-pet/scan");
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
                    name="swap-horizontal"
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
                Transfer a Pet
              </Text>

              {/* Instructional Text */}
              <Text
                className="text-base text-center mb-8"
                style={{ color: theme.secondary }}
              >
                Enter the transfer code from the previous owner
              </Text>

              {/* Transfer Code Input */}
              <View className="mb-4">
                <Text
                  className="text-base font-medium mb-2"
                  style={{ color: theme.foreground }}
                >
                  Transfer Code
                </Text>
                <TextInput
                  value={transferCode}
                  onChangeText={(text) => {
                    setTransferCode(text);
                    setError(null);
                  }}
                  placeholder="e.g., TRF-LUNA-2024-ABC1"
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
                  Scan Transfer QR Code
                </Text>
              </Pressable>

              {/* Hint Text */}
              <Text
                className="text-sm text-center mb-8"
                style={{ color: theme.secondary }}
              >
                The previous owner should have shared a transfer code or QR code with you
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Button */}
      <View className="px-6 pb-8 pt-4">
        <Pressable
          onPress={handleVerifyCode}
          disabled={!transferCode.trim() || verifying}
          className="w-full rounded-2xl py-5 items-center active:opacity-90"
          style={{
            backgroundColor: transferCode.trim() && !verifying ? "#FF9500" : (isDarkMode ? "#374151" : theme.border),
            opacity: (!transferCode.trim() || verifying) ? 0.6 : 1,
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

