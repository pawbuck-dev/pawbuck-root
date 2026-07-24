import { useTheme } from "@/context/themeContext";
import { verifyTransferCode } from "@/services/petTransfers";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, type ComponentType } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";

type ScannerModalProps = {
  visible: boolean;
  onClose: () => void;
  onCodeScanned: (code: string) => void;
};

export default function TransferPet() {
  const router = useRouter();
  const { transferCode: transferCodeParam } = useLocalSearchParams<{ transferCode?: string }>();
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  const [transferCode, setTransferCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [ScannerModal, setScannerModal] = useState<ComponentType<ScannerModalProps> | null>(
    null,
  );

  useEffect(() => {
    const raw = Array.isArray(transferCodeParam) ? transferCodeParam[0] : transferCodeParam;
    if (raw?.trim()) {
      setTransferCode(raw.trim().toUpperCase());
    }
  }, [transferCodeParam]);

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
                Scan the QR code or enter the transfer code from the previous owner
              </Text>

              <Pressable
                testID="scan-transfer-qr"
                accessibilityRole="button"
                accessibilityLabel="Scan QR code"
                onPress={() => {
                  setError(null);
                  try {
                    // Lazy-load so Transfer screen still works before a native rebuild.
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    const mod = require("@/components/transfer/TransferCodeQrScannerModal") as {
                      TransferCodeQrScannerModal: ComponentType<ScannerModalProps>;
                    };
                    setScannerModal(() => mod.TransferCodeQrScannerModal);
                    setScannerOpen(true);
                  } catch {
                    Alert.alert(
                      "Rebuild required",
                      "QR scanning needs a fresh native build. Stop Metro, then run npx expo run:ios again.",
                    );
                  }
                }}
                disabled={verifying}
                className="w-full rounded-2xl py-4 mb-6 flex-row items-center justify-center active:opacity-90"
                style={{
                  backgroundColor: "transparent",
                  borderWidth: 1.5,
                  borderColor: "#FF9500",
                  opacity: verifying ? 0.6 : 1,
                  gap: 8,
                }}
              >
                <Ionicons name="qr-code-outline" size={22} color="#FF9500" />
                <Text className="text-base font-semibold" style={{ color: "#FF9500" }}>
                  Scan QR code
                </Text>
              </Pressable>

              <View className="flex-row items-center mb-6" style={{ gap: 12 }}>
                <View
                  className="flex-1 h-px"
                  style={{ backgroundColor: isDarkMode ? "#374151" : theme.border }}
                />
                <Text className="text-sm" style={{ color: theme.secondary }}>
                  Or enter code
                </Text>
                <View
                  className="flex-1 h-px"
                  style={{ backgroundColor: isDarkMode ? "#374151" : theme.border }}
                />
              </View>

              {/* Transfer Code Input */}
              <View className="mb-4">
                <Text
                  className="text-base font-medium mb-2"
                  style={{ color: theme.foreground }}
                >
                  Transfer Code
                </Text>
                <TextInput
                  testID="transfer-code-input"
                  accessibilityLabel="Transfer Code"
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

              <Text
                className="text-sm text-center mb-8"
                style={{ color: theme.secondary }}
              >
                The previous owner should have shared a TRF transfer code or QR with you.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Button */}
      <View className="px-6 pb-8 pt-4">
        <Pressable
          testID="verify-transfer-code"
          accessibilityRole="button"
          accessibilityLabel="Verify Code"
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

      {ScannerModal ? (
        <ScannerModal
          visible={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onCodeScanned={(code) => {
            setTransferCode(code);
            setError(null);
          }}
        />
      ) : null}
    </View>
  );
}

