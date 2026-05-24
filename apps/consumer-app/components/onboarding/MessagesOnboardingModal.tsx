import { useTheme } from "@/context/themeContext";
import { trackOnboardingEvent } from "@/utils/analytics";
import { markMessagesOnboardingSeen } from "@/utils/onboardingStorage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface MessagesOnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function MessagesOnboardingModal({
  visible,
  onClose,
}: MessagesOnboardingModalProps) {
  const { theme, mode } = useTheme();
  const { top, bottom } = useSafeAreaInsets();

  // Track when modal is shown
  useEffect(() => {
    if (visible) {
      trackOnboardingEvent("messages_onboarding_shown");
    }
  }, [visible]);

  /** Close UI first — awaiting Supabase analytics on device can hang and feel like a dead tap. */
  const handleGotIt = () => {
    onClose();
    void (async () => {
      try {
        await markMessagesOnboardingSeen();
      } catch (e) {
        console.error("[MessagesOnboardingModal] mark seen", e);
      }
      try {
        await trackOnboardingEvent("messages_onboarding_completed");
      } catch (e) {
        console.error("[MessagesOnboardingModal] analytics", e);
      }
    })();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleGotIt}
      hardwareAccelerated
    >
      <View
        className="flex-1 items-center justify-center px-6"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          paddingTop: Platform.OS === "android" ? top : 0,
          paddingBottom: Platform.OS === "android" ? bottom : 0,
        }}
        collapsable={false}
      >
        <View
          className="rounded-3xl p-6 w-full max-w-md"
          style={{
            backgroundColor: theme.card,
            ...(Platform.OS === "android" ? { elevation: 12 } : {}),
          }}
          collapsable={false}
        >
          {/* Icon */}
          <View className="items-center mb-4">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Ionicons
                name="chatbubbles-outline"
                size={32}
                color={theme.primary}
              />
            </View>
            <Text
              className="text-xl font-bold text-center mb-2"
              style={{ color: theme.foreground }}
            >
              Do you know?
            </Text>
          </View>

          {/* Message */}
          <View className="mb-6">
            <Text
              className="text-base text-center leading-6"
              style={{ color: theme.secondary }}
            >
              You can email your pet's care team directly from PawBuck — tap{" "}
              <Text style={{ color: theme.primary, fontWeight: "600" }}>
                +
              </Text>{" "}
              to start a message or reply like a chat.
            </Text>
          </View>

          {/* TouchableOpacity: Android + transparent Modal often drops Pressable hits; avoid awaiting network before close */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleGotIt}
            accessibilityRole="button"
            accessibilityLabel="Got it"
            style={{
              width: "100%",
              minHeight: 52,
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.primary,
              ...(Platform.OS === "android" ? { elevation: 4 } : {}),
            }}
          >
            <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>
              Got it!
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
