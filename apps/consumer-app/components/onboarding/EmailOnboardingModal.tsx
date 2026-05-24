import { useTheme } from "@/context/themeContext";
import { trackOnboardingEvent } from "@/utils/analytics";
import { markEmailOnboardingSeen } from "@/utils/onboardingStorage";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect } from "react";
import { Alert, Modal, Platform, Pressable, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface EmailOnboardingModalProps {
  visible: boolean;
  petEmail: string;
  onClose: () => void;
}

export default function EmailOnboardingModal({
  visible,
  petEmail,
  onClose,
}: EmailOnboardingModalProps) {
  const { theme, mode } = useTheme();
  const { top, bottom } = useSafeAreaInsets();

  const handleCopyEmail = async () => {
    try {
      await Clipboard.setStringAsync(petEmail);
      Alert.alert("Copied!", "Email address copied to clipboard");
    } catch (error) {
      console.error("Failed to copy email:", error);
      Alert.alert("Error", "Failed to copy email address");
    }
  };

  // Track when modal is shown
  useEffect(() => {
    if (visible) {
      trackOnboardingEvent("email_onboarding_shown", {
        pet_email: petEmail,
      });
    }
  }, [visible, petEmail]);

  const handleGotIt = () => {
    onClose();
    void (async () => {
      try {
        await markEmailOnboardingSeen();
      } catch (e) {
        console.error("[EmailOnboardingModal] mark seen", e);
      }
      try {
        await trackOnboardingEvent("email_onboarding_completed", { pet_email: petEmail });
      } catch (e) {
        console.error("[EmailOnboardingModal] analytics", e);
      }
    })();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleGotIt}
      hardwareAccelerated
    >
      <View
        className="flex-1"
        style={{
          backgroundColor: theme.background,
          paddingTop: Platform.OS === "android" ? top : 0,
          paddingBottom: Platform.OS === "android" ? bottom : 0,
        }}
        collapsable={false}
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
            Your Pet's Email
          </Text>
          <TouchableOpacity
            onPress={handleGotIt}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              ...(Platform.OS === "android" ? { elevation: 1 } : {}),
            }}
          >
            <Ionicons name="close" size={24} color={theme.foreground} />
          </TouchableOpacity>
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
                name="mail-outline"
                size={48}
                color={theme.primary}
              />
            </View>
            <Text
              className="text-2xl font-bold mb-2 text-center"
              style={{ color: theme.foreground }}
            >
              Your pet has an email!
            </Text>
            <Text
              className="text-base text-center px-4"
              style={{ color: theme.secondary }}
            >
              Send records to your pet’s email. We’ll handle the rest.
            </Text>
          </View>

          {/* Email Address Card */}
          <View
            className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: theme.card }}
          >
            <Text
              className="text-sm font-medium mb-2 uppercase tracking-wide"
              style={{ color: theme.secondary }}
            >
              Pet Email Address
            </Text>
            <Text
              className="text-2xl font-semibold mb-4"
              style={{ color: theme.primary }}
            >
              {petEmail}
            </Text>

            {/* Copy Button */}
            <Pressable
              onPress={handleCopyEmail}
              className="flex-row items-center justify-center py-3 px-4 rounded-xl active:opacity-80"
              style={{
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Ionicons
                name="copy-outline"
                size={20}
                color={theme.foreground}
                style={{ marginRight: 8 }}
              />
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
              >
                Copy Email
              </Text>
            </Pressable>
          </View>

          {/* How It Works */}
          <View
            className="rounded-2xl p-4 mb-6"
            style={{ backgroundColor: `${theme.primary}10` }}
          >
            <View className="flex-row items-start mb-3">
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={theme.primary}
                style={{ marginRight: 12, marginTop: 2 }}
              />
              <View className="flex-1">
                <Text
                  className="text-sm font-semibold mb-1"
                  style={{ color: theme.foreground }}
                >
                  How it works
                </Text>
                <Text
                  className="text-sm leading-5"
                  style={{ color: theme.secondary }}
                >
                  Forward any health docs—or have your vet send them over—and we'll take it from there.{" "}
                  <Text style={{ fontWeight: "600", color: theme.foreground }}>
                    Your pet's vaccines, prescriptions, and invoices, all organized in one place.
                  </Text>
                </Text>
              </View>
            </View>
          </View>

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
