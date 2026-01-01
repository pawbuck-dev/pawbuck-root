import { PendingApprovalWithPet } from "@/services/pendingEmailApprovals";
import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import moment from "moment";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface MessageListItemProps {
  approval: PendingApprovalWithPet;
  onPress: () => void;
}

export default function MessageListItem({ approval, onPress }: MessageListItemProps) {
  const { theme, mode } = useTheme();
  const isIncorrect = approval.validation_status === "incorrect";
  const validationErrors = approval.validation_errors || {};
  const documentType = approval.document_type;

  // Get sender display name
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

  // Get initials for avatar
  const getInitials = (): string => {
    const senderName = getSenderName();
    const parts = senderName.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return senderName.substring(0, 2).toUpperCase();
  };

  // Get document type display name
  const getDocumentTypeName = (): string => {
    if (!documentType) return "";
    const typeMap: Record<string, string> = {
      travel_certificate: "Travel Certificate",
      vaccination: "Vaccination Certificate",
      lab_result: "Lab Result",
      exam: "Clinical Exam",
    };
    return typeMap[documentType] || documentType.replace(/_/g, " ");
  };

  // Get error message for display
  const getErrorMessage = (): string | null => {
    if (!isIncorrect) return null;
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
  };

  // Format time ago
  const getTimeAgo = (): string => {
    const createdAt = approval.created_at;
    if (!createdAt) return "";
    return moment(createdAt).fromNow();
  };

  // Get business/clinic name (simplified - could be enhanced with vet_information lookup)
  const getBusinessName = (): string => {
    const email = approval.sender_email || "";
    const domain = email.split("@")[1]?.split(".")[0] || "";
    // Capitalize domain name
    return domain.charAt(0).toUpperCase() + domain.slice(1).replace(/[-_]/g, " ");
  };

  const senderName = getSenderName();
  const businessName = getBusinessName();
  const errorMessage = getErrorMessage();
  const timeAgo = getTimeAgo();
  const initials = getInitials();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="mx-4 mb-3 rounded-2xl p-4"
      style={{
        backgroundColor: isIncorrect
          ? mode === "dark"
            ? "#4B1F1F"
            : "#FFF5F5"
          : theme.card,
        borderWidth: 1,
        borderColor: isIncorrect
          ? mode === "dark"
            ? "#7F1D1D"
            : "#FEE2E2"
          : theme.border,
      }}
    >
      <View className="flex-row items-start">
        {/* Avatar */}
        <View className="relative mr-3">
          {isIncorrect ? (
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: "#FEE2E2" }}
            >
              <Ionicons name="warning" size={24} color="#EF4444" />
            </View>
          ) : (
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Text
                className="text-base font-bold"
                style={{ color: theme.primary }}
              >
                {initials}
              </Text>
            </View>
          )}
          {/* Online indicator (if needed in future) */}
          {/* <View className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" /> */}
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Header: Name and Time */}
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className="text-base font-semibold flex-1"
              style={{
                color: isIncorrect ? "#EF4444" : theme.foreground,
              }}
              numberOfLines={1}
            >
              {senderName}
            </Text>
            <Text
              className="text-xs ml-2"
              style={{ color: theme.secondary }}
            >
              {timeAgo}
            </Text>
          </View>

          {/* Business Name */}
          {businessName && (
            <Text
              className="text-sm mb-1"
              style={{ color: theme.secondary }}
              numberOfLines={1}
            >
              {businessName}
            </Text>
          )}

          {/* Error Message or Preview */}
          {errorMessage ? (
            <View className="flex-row items-center mt-1">
              <Ionicons
                name="alert-circle"
                size={16}
                color="#F59E0B"
                style={{ marginRight: 6 }}
              />
              <Text
                className="text-sm font-medium"
                style={{
                  color: isIncorrect ? "#EF4444" : theme.foreground,
                }}
              >
                ! {errorMessage}
              </Text>
            </View>
          ) : (
            <Text
              className="text-sm mt-1"
              style={{ color: theme.secondary }}
              numberOfLines={1}
            >
              {getDocumentTypeName() || "New message"}
            </Text>
          )}

          {/* Document Type Badge (for non-incorrect messages) */}
          {documentType && !isIncorrect && (
            <View className="flex-row items-center mt-2">
              <Ionicons
                name="document-text"
                size={14}
                color={theme.secondary}
                style={{ marginRight: 4 }}
              />
              <Text
                className="text-xs"
                style={{ color: theme.secondary }}
              >
                {getDocumentTypeName()}
              </Text>
            </View>
          )}
        </View>

        {/* Unread Badge and Arrow */}
        <View className="items-end ml-2">
          <View
            className="w-5 h-5 rounded-full items-center justify-center mb-1"
            style={{
              backgroundColor: isIncorrect ? "#EF4444" : theme.primary,
            }}
          >
            <Text className="text-xs font-bold text-white">1</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.secondary}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}


