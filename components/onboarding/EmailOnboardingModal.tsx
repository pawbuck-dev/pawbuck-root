import { useTheme } from "@/context/themeContext";
import { trackOnboardingEvent } from "@/utils/analytics";
import { markEmailOnboardingSeen } from "@/utils/onboardingStorage";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect } from "react";
import { Alert, Modal, Platform, Pressable, Text, View } from "react-native";
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

  const handleGotIt = async () => {
    await markEmailOnboardingSeen();
    await trackOnboardingEvent("email_onboarding_completed", {
      pet_email: petEmail,
    });
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
            Your Pet's Email
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
              Send records to your pet’s email.We’ll handle the rest.
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
                  Forward any pet health documents — or ask your vet to send them. PawBuck does the rest.{" "}
                  Vaccines • Prescriptions • Lab results • Invoices
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
