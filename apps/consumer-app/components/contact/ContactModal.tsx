import { CONTACT_EMAIL } from "@/constants/contact";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { Alert, Modal, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ContactModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ContactModal({ visible, onClose }: ContactModalProps) {
  const { theme, mode } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();

  const handleCopyEmail = async () => {
    try {
      await Clipboard.setStringAsync(CONTACT_EMAIL);
      Alert.alert("Copied!", "Email address copied to clipboard");
    } catch (error) {
      console.error("Failed to copy email:", error);
      Alert.alert("Error", "Failed to copy email address");
    }
  };

  const handleSendEmail = () => {
    // Close the contact modal
    onClose();
    
    // Navigate to messages screen with support email pre-filled
    router.push({
      pathname: "/(home)/messages",
      params: { email: CONTACT_EMAIL },
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
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
            Contact Us
          </Text>
          <Pressable
            onPress={onClose}
            className="w-10 h-10 items-center justify-center active:opacity-70"
          >
            <Ionicons name="close" size={24} color={theme.foreground} />
          </Pressable>
        </View>

        {/* Content */}
        <View className="flex-1 px-6 pt-8">
          <View className="items-center mb-8">
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Ionicons
                name="mail-outline"
                size={40}
                color={theme.primary}
              />
            </View>
            <Text
              className="text-lg font-semibold mb-2"
              style={{ color: theme.foreground }}
            >
              We're here to help!
            </Text>
            <Text
              className="text-sm text-center"
              style={{ color: theme.secondary }}
            >
              Reach out to us with any questions or concerns
            </Text>
          </View>

          {/* Email Card */}
          <View
            className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: theme.card }}
          >
            <Text
              className="text-sm font-medium mb-2 uppercase tracking-wide"
              style={{ color: theme.secondary }}
            >
              Email Address
            </Text>
            <Text
              className="text-xl font-semibold mb-4"
              style={{ color: theme.primary }}
            >
              {CONTACT_EMAIL}
            </Text>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleCopyEmail}
                className="flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl active:opacity-80"
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
                  Copy
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSendEmail}
                className="flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl active:opacity-80"
                style={{ backgroundColor: theme.primary }}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text
                  className="text-base font-semibold"
                  style={{ color: "#FFFFFF" }}
                >
                  Send Email
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Additional Info */}
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: `${theme.primary}10` }}
          >
            <View className="flex-row items-start mb-3">
              <Ionicons
                name="time-outline"
                size={20}
                color={theme.primary}
                style={{ marginRight: 12, marginTop: 2 }}
              />
              <View className="flex-1">
                <Text
                  className="text-sm font-semibold mb-1"
                  style={{ color: theme.foreground }}
                >
                  Response Time
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: theme.secondary }}
                >
                  We typically respond within 24-48 hours
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
