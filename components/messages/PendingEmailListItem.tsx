import { useTheme } from "@/context/themeContext";
import { PendingApprovalWithPet } from "@/services/pendingEmailApprovals";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface PendingEmailListItemProps {
  approval: PendingApprovalWithPet;
  onPress: () => void;
}

export default function PendingEmailListItem({
  approval,
  onPress,
}: PendingEmailListItemProps) {
  const { theme } = useTheme();
  const isIncorrect = approval.validation_status === "incorrect";
  const validationErrors = approval.validation_errors || {};
  const documentType = approval.document_type;

  // Determine accent color based on status
  const accentColor = isIncorrect ? "#EF4444" : theme.primary;
  const accentBgColor = isIncorrect ? "rgba(239, 68, 68, 0.15)" : `${theme.primary}15`;

  // Get sender display name (try to get proper name from email)
  const getSenderName = (): string => {
    const email = approval.sender_email || "";
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
    const email = approval.sender_email || "";
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

  // Get status message for display
  const getStatusMessage = (): string => {
    if (isIncorrect) {
      const errors = Object.keys(validationErrors);
      if (errors.includes("microchip_number")) {
        return "Microchip Number Mismatch";
      }
      if (errors.includes("pet_name")) {
        return "Pet Name Mismatch";
      }
      if (errors.length > 0) {
        return `${errors[0].replace(/_/g, " ")} Mismatch`;
      }
      return "Information Mismatch";
    }
    return "New sender - approval required";
  };

  // Format time ago
  const getTimeAgo = (): string => {
    const createdAt = approval.created_at;
    if (!createdAt) return "";
    return moment(createdAt).fromNow();
  };

  const senderName = getSenderName();
  const businessName = getBusinessName();
  const statusMessage = getStatusMessage();
  const timeAgo = getTimeAgo();
  const docTypeName = getDocumentTypeName(documentType);

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
        {/* Status Icon */}
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: accentBgColor }}
        >
          {isIncorrect ? (
            <Ionicons name="warning" size={20} color={accentColor} />
          ) : (
            <Ionicons name="mail-unread" size={20} color={accentColor} />
          )}
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

          {/* Status Message with Icon */}
          <View className="flex-row items-center">
            <Ionicons
              name={isIncorrect ? "alert-circle" : "time-outline"}
              size={14}
              color={isIncorrect ? "#F59E0B" : theme.secondary}
              style={{ marginRight: 4 }}
            />
            <Text
              className="text-sm flex-1"
              style={{ color: theme.secondary }}
              numberOfLines={1}
            >
              {statusMessage}
            </Text>
          </View>
        </View>

        {/* Right Side: Timestamp, Badge, Document Type */}
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

          {/* Notification Badge */}
          <View
            className="w-5 h-5 rounded-full items-center justify-center"
            style={{ backgroundColor: accentColor }}
          >
            <Text className="text-xs font-bold text-white">1</Text>
          </View>
        </View>
      </View>

      {/* Pet Name Badge */}
      {approval.pets?.name && (
        <View className="flex-row items-center mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
          <Ionicons name="paw" size={14} color={theme.secondary} style={{ marginRight: 6 }} />
          <Text className="text-sm" style={{ color: theme.secondary }}>
            For {approval.pets.name}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
