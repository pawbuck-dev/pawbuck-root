import { useTheme } from "@/context/themeContext";
import { trackOnboardingEvent } from "@/utils/analytics";
import { markHealthRecordsTooltipSeen } from "@/utils/onboardingStorage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface HealthRecordsTooltipModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function HealthRecordsTooltipModal({
  visible,
  onClose,
}: HealthRecordsTooltipModalProps) {
  const { theme, mode } = useTheme();
  const { top, bottom } = useSafeAreaInsets();

  // Track when modal is shown
  useEffect(() => {
    if (visible) {
      trackOnboardingEvent("health_records_tooltip_shown");
    }
  }, [visible]);

  const handleGotIt = async () => {
    await markHealthRecordsTooltipSeen();
    await trackOnboardingEvent("health_records_tooltip_completed");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleGotIt}
    >
      <View
        className="flex-1"
        style={{
          backgroundColor: theme.background,
          paddingTop: Platform.OS === "android" ? top : 0,
          paddingBottom: Platform.OS === "android" ? bottom : 0,
        }}
      >
        {/* Header */}
        <View
          className="px-6 pt-4 pb-4 border-b flex-row items-center justify-between"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          }}
        >
          <Text
            className="text-xl font-bold"
            style={{ color: theme.foreground }}
          >
            Add Health Records
          </Text>
          <Pressable
            onPress={handleGotIt}
            className="w-10 h-10 items-center justify-center active:opacity-70"
          >
            <Ionicons name="close" size={24} color={theme.foreground} />
          </Pressable>
        </View>

        {/* Content */}
        <View className="flex-1 px-6 pt-8">
          {/* Icon/Illustration */}
          <View className="items-center mb-8">
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Ionicons
                name="document-text-outline"
                size={48}
                color={theme.primary}
              />
            </View>
            <Text
              className="text-2xl font-bold mb-2 text-center"
              style={{ color: theme.foreground }}
            >
              Two ways to add records
            </Text>
          </View>

          {/* Method 1: Email */}
          <View
            className="rounded-2xl p-5 mb-4"
            style={{ backgroundColor: theme.card }}
          >
            <View className="flex-row items-start mb-3">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${theme.primary}20` }}
              >
                <Ionicons
                  name="mail-outline"
                  size={24}
                  color={theme.primary}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold mb-2"
                  style={{ color: theme.foreground }}
                >
                  Email documents
                </Text>
                <Text
                  className="text-sm leading-5"
                  style={{ color: theme.secondary }}
                >
                  Forward vaccine PDFs, prescriptions, lab results, or vet summaries to your pet's email address. PawBuck will automatically extract and organize the information.
                </Text>
              </View>
            </View>
          </View>

          {/* Method 2: Upload */}
          <View
            className="rounded-2xl p-5 mb-6"
            style={{ backgroundColor: theme.card }}
          >
            <View className="flex-row items-start mb-3">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${theme.primary}20` }}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={24}
                  color={theme.primary}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold mb-2"
                  style={{ color: theme.foreground }}
                >
                  Upload in app
                </Text>
                <Text
                  className="text-sm leading-5"
                  style={{ color: theme.secondary }}
                >
                  Tap the + button in the top right corner to upload documents directly from your device. You can also manually enter information if needed.
                </Text>
              </View>
            </View>
          </View>

          {/* Examples */}
          <View
            className="rounded-2xl p-4 mb-6"
            style={{ backgroundColor: `${theme.primary}10` }}
          >
            <View className="flex-row items-start">
              <Ionicons
                name="bulb-outline"
                size={20}
                color={theme.primary}
                style={{ marginRight: 12, marginTop: 2 }}
              />
              <View className="flex-1">
                <Text
                  className="text-sm font-semibold mb-1"
                  style={{ color: theme.foreground }}
                >
                  What you can add
                </Text>
                <Text
                  className="text-sm leading-5"
                  style={{ color: theme.secondary }}
                >
                  Vaccination certificates, medication prescriptions, lab test results, vet visit summaries, invoices, and more.
                </Text>
              </View>
            </View>
          </View>

          {/* Got It Button */}
          <Pressable
            onPress={handleGotIt}
            className="w-full py-4 px-6 rounded-2xl items-center active:opacity-80"
            style={{ backgroundColor: theme.primary }}
          >
            <Text
              className="text-base font-semibold"
              style={{ color: "#FFFFFF" }}
            >
              Got it!
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
