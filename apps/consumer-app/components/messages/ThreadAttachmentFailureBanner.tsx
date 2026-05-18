import { useTheme } from "@/context/themeContext";
import {
  FailedEmail,
  summarizeAttachmentFailureReason,
} from "@/services/failedEmails";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  failures: FailedEmail[];
  petName?: string;
  onPress: (failure: FailedEmail) => void;
};

export default function ThreadAttachmentFailureBanner({
  failures,
  petName,
  onPress,
}: Props) {
  const { theme } = useTheme();
  if (failures.length === 0) return null;

  const latest = failures[0];
  const detail = latest.failure_reason
    ? summarizeAttachmentFailureReason(latest.failure_reason)
    : "We could not add the attachment to health records.";

  return (
    <Pressable
      onPress={() => onPress(latest)}
      accessibilityRole="button"
      accessibilityLabel="Attachment could not be processed. Tap for details."
      className="mx-4 mb-3 rounded-2xl px-4 py-3"
      style={{
        backgroundColor: theme.warning + "22",
        borderWidth: 1,
        borderColor: theme.warning + "55",
      }}
    >
      <View className="flex-row items-start">
        <Ionicons
          name="alert-circle"
          size={22}
          color={theme.warning}
          style={{ marginRight: 10, marginTop: 1 }}
        />
        <View className="flex-1">
          <Text
            className="text-sm font-semibold mb-1"
            style={{ color: theme.foreground }}
          >
            Attachment not added to health records
          </Text>
          <Text className="text-sm leading-5" style={{ color: theme.secondary }}>
            {petName
              ? `The file in this email was not added to ${petName}'s profile. `
              : "The file in this email was not added to your pet's profile. "}
            {detail}
          </Text>
          <Text
            className="text-sm font-semibold mt-2"
            style={{ color: theme.primary }}
          >
            Tap for details
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
