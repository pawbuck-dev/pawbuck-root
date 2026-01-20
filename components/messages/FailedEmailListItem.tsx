import { useTheme } from "@/context/themeContext";
import { FailedEmail } from "@/services/failedEmails";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface FailedEmailListItemProps {
  failedEmail: FailedEmail;
  onPress: () => void;
}

export default function FailedEmailListItem({
  failedEmail,
  onPress,
}: FailedEmailListItemProps) {
  const { theme } = useTheme();

  // Error color scheme
  const accentColor = "#EF4444";
  const accentBgColor = "rgba(239, 68, 68, 0.15)";

  // Get sender display name (try to get proper name from email)
  const getSenderName = (): string => {
    const email = failedEmail.sender_email || "";
    if (!email) return "Unknown Sender";
    // Extract name from email or use first part before @
    const namePart = email.split("@")[0];
    // Capitalize first letter of each word
    return namePart
      .split(/[._-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get business/clinic name (simplified - could be enhanced with vet_information lookup)
  const getBusinessName = (): string => {
    const email = failedEmail.sender_email || "";
    if (!email) return "";
    const domain = email.split("@")[1]?.split(".")[0] || "";
    // Capitalize domain name
    const business =
      domain.charAt(0).toUpperCase() + domain.slice(1).replace(/[-_]/g, " ");
    // Truncate if too long
    return business.length > 30 ? business.substring(0, 27) + "..." : business;
  };

  // Get document type display name
  const getDocumentTypeName = (type: string | null | undefined): string => {
    if (!type) return "";
    const typeMap: Record<string, string> = {
      travel_certificate: "Travel Certificate",
      vaccination: "Vaccination",
      lab_result: "Lab Result",
      exam: "Clinical Exam",
    };
    return (
      typeMap[type] ||
      type
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  // Get truncated failure reason for preview
  const getFailurePreview = (): string => {
    const reason = failedEmail.failure_reason;
    if (!reason) return "Processing failed";
    // Truncate to ~50 chars
    return reason.length > 50 ? reason.substring(0, 47) + "..." : reason;
  };

  // Format time ago
  const getTimeAgo = (): string => {
    const completedAt = failedEmail.completed_at;
    if (!completedAt) return "";
    return moment(completedAt).fromNow();
  };

  const senderName = getSenderName();
  const businessName = getBusinessName();
  const failurePreview = getFailurePreview();
  const timeAgo = getTimeAgo();
  const docTypeName = getDocumentTypeName(failedEmail.document_type);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="mx-4 mb-3 rounded-2xl p-4"
      style={{
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View className="flex-row items-start">
        {/* Error Icon */}
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: accentBgColor }}
        >
          <Ionicons name="close-circle" size={20} color={accentColor} />
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Contact Name */}
          <Text
            className="text-base font-semibold mb-0.5"
            style={{ color: accentColor }}
            numberOfLines={1}
          >
            {senderName}
          </Text>

          {/* Business Name */}
          {businessName && (
            <Text
              className="text-sm mb-1.5"
              style={{ color: theme.secondary }}
              numberOfLines={1}
            >
              {businessName}
            </Text>
          )}

          {/* Failure Reason Preview */}
          <View className="flex-row items-center">
            <Ionicons
              name="alert-circle"
              size={14}
              color={accentColor}
              style={{ marginRight: 4 }}
            />
            <Text
              className="text-sm flex-1"
              style={{ color: theme.secondary }}
              numberOfLines={1}
            >
              {failurePreview}
            </Text>
          </View>
        </View>

        {/* Right Side: Timestamp, Document Type */}
        <View className="items-end ml-2">
          <Text className="text-xs mb-2" style={{ color: theme.secondary }}>
            {timeAgo}
          </Text>

          {/* Document Type Badge */}
          {docTypeName && (
            <View
              className="px-2 py-1 rounded-full mb-1"
              style={{ backgroundColor: accentBgColor }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: accentColor }}
              >
                {docTypeName}
              </Text>
            </View>
          )}

          {/* Failed Badge */}
          <View
            className="px-2 py-1 rounded-full"
            style={{ backgroundColor: accentColor }}
          >
            <Text className="text-xs font-bold text-white">Failed</Text>
          </View>
        </View>
      </View>

      {/* Pet Name and Subject */}
      <View
        className="mt-3 pt-3"
        style={{ borderTopWidth: 1, borderTopColor: theme.border }}
      >
        {failedEmail.pets?.name && (
          <View className="flex-row items-center mb-1">
            <Ionicons
              name="paw"
              size={14}
              color={theme.secondary}
              style={{ marginRight: 6 }}
            />
            <Text className="text-sm" style={{ color: theme.secondary }}>
              For {failedEmail.pets.name}
            </Text>
          </View>
        )}
        {failedEmail.subject && (
          <View className="flex-row items-center">
            <Ionicons
              name="mail-outline"
              size={14}
              color={theme.secondary}
              style={{ marginRight: 6 }}
            />
            <Text
              className="text-sm flex-1"
              style={{ color: theme.secondary }}
              numberOfLines={1}
            >
              {failedEmail.subject}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
