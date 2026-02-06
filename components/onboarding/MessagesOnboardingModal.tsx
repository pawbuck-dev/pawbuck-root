import { useTheme } from "@/context/themeContext";
import { trackOnboardingEvent } from "@/utils/analytics";
import { markMessagesOnboardingSeen } from "@/utils/onboardingStorage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
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

  const handleGotIt = async () => {
    await markMessagesOnboardingSeen();
    await trackOnboardingEvent("messages_onboarding_completed");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleGotIt}
    >
      <View
        className="flex-1 items-center justify-center px-6"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          paddingTop: Platform.OS === "android" ? top : 0,
          paddingBottom: Platform.OS === "android" ? bottom : 0,
        }}
      >
        <View
          className="rounded-3xl p-6 w-full max-w-md"
          style={{ backgroundColor: theme.card }}
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
