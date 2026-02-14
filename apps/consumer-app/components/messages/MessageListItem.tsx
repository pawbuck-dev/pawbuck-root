import { PendingApprovalWithPet } from "@/services/pendingEmailApprovals";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
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
    const business = domain.charAt(0).toUpperCase() + domain.slice(1).replace(/[-_]/g, " ");
    // Truncate if too long
    return business.length > 30 ? business.substring(0, 27) + "..." : business;
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

  const senderName = getSenderName();
  const businessName = getBusinessName();
  const errorMessage = getErrorMessage();
  const timeAgo = getTimeAgo();

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
        {/* Red Warning Icon */}
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.15)" }}
        >
          <Ionicons name="warning" size={20} color="#EF4444" />
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Contact Name (in red) */}
          <Text
            className="text-base font-semibold mb-1"
            style={{ color: "#EF4444" }}
            numberOfLines={1}
          >
            {senderName}
          </Text>

          {/* Business Name */}
          {businessName && (
            <Text
              className="text-sm mb-2"
              style={{ color: theme.secondary }}
              numberOfLines={1}
            >
              {businessName}
            </Text>
          )}

          {/* Message Snippet with Yellow Warning Icon */}
          {errorMessage && (
            <View className="flex-row items-center">
              <Ionicons
                name="alert-circle"
                size={16}
                color="#F59E0B"
                style={{ marginRight: 6 }}
              />
              <Text
                className="text-sm flex-1"
                style={{ color: theme.secondary }}
                numberOfLines={1}
              >
                {errorMessage}
              </Text>
            </View>
          )}
        </View>

        {/* Right Side: Timestamp, Badge, Chevron */}
        <View className="items-end ml-2">
          <Text
            className="text-xs mb-2"
            style={{ color: theme.secondary }}
          >
            {timeAgo}
          </Text>
          <View
            className="w-5 h-5 rounded-full items-center justify-center mb-1"
            style={{ backgroundColor: "#EF4444" }}
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
