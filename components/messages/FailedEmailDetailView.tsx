import { useTheme } from "@/context/themeContext";
import { FailedEmail } from "@/services/failedEmails";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

interface FailedEmailDetailViewProps {
  failedEmail: FailedEmail;
  onBack: () => void;
  hideHeader?: boolean;
}

export default function FailedEmailDetailView({
  failedEmail,
  onBack,
  hideHeader = false,
}: FailedEmailDetailViewProps) {
  const { theme } = useTheme();

  const petName = failedEmail.pets?.name || "Unknown Pet";

  // Error color
  const errorColor = "#EF4444";

  // Get document type display name
  const getDocumentTypeName = (type: string | null | undefined): string => {
    if (!type) return "Email";
    const typeMap: Record<string, string> = {
      travel_certificate: "Travel Certificate",
      vaccination: "Vaccination Certificate",
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

  // Get sender display name
  const getSenderName = (): string => {
    const email = failedEmail.sender_email || "";
    if (!email) return "Unknown Sender";
    const namePart = email.split("@")[0];
    return namePart
      .split(/[._-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get business/clinic name
  const getBusinessName = (): string => {
    const email = failedEmail.sender_email || "";
    if (!email) return "";
    const domain = email.split("@")[1]?.split(".")[0] || "";
    const business =
      domain.charAt(0).toUpperCase() + domain.slice(1).replace(/[-_]/g, " ");
    return business.length > 30 ? business.substring(0, 27) + "..." : business;
  };

  // Format timestamp
  const getFormattedTime = (): string => {
    if (!failedEmail.completed_at) return "";
    return moment(failedEmail.completed_at).format("MMM D, YYYY [at] h:mm A");
  };

  const senderName = getSenderName();
  const businessName = getBusinessName();
  const formattedTime = getFormattedTime();

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* Header - conditionally shown */}
      {!hideHeader && (
        <View
          className="flex-row items-center px-6 py-4 border-b"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          }}
        >
          <TouchableOpacity
            onPress={onBack}
            className="w-10 h-10 items-center justify-center mr-4"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={theme.foreground} />
          </TouchableOpacity>
          <View className="flex-1 items-center justify-center">
            <Text
              className="text-lg font-semibold"
              style={{ color: theme.foreground }}
              numberOfLines={1}
            >
              Failed Email
            </Text>
          </View>
          <View className="w-10 h-10 mr-4" />
        </View>
      )}

      {/* Info Bar - shown when header is hidden */}
      {hideHeader && (
        <View
          className="items-center px-4 py-3 border-b"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          }}
        >
          <Text
            className="text-base font-semibold text-center"
            style={{ color: errorColor }}
            numberOfLines={1}
          >
            Processing Failed
          </Text>
          <Text
            className="text-sm text-center"
            style={{ color: theme.secondary }}
            numberOfLines={1}
          >
            Email for {petName}
          </Text>
        </View>
      )}

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Icon */}
        <View className="items-center mb-6">
          <View
            className="w-20 h-20 rounded-2xl items-center justify-center"
            style={{ backgroundColor: `${errorColor}20` }}
          >
            <Ionicons name="close-circle" size={40} color={errorColor} />
          </View>
        </View>

        {/* Title */}
        <Text
          className="text-xl font-bold text-center mb-2"
          style={{ color: theme.foreground }}
        >
          Email Processing Failed
        </Text>

        {/* Document Type Badge */}
        {failedEmail.document_type && (
          <View className="items-center mb-4">
            <View
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: `${errorColor}15` }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: errorColor }}
              >
                {getDocumentTypeName(failedEmail.document_type)}
              </Text>
            </View>
          </View>
        )}

        {/* Timestamp */}
        {formattedTime && (
          <Text
            className="text-center text-sm mb-4"
            style={{ color: theme.secondary }}
          >
            {formattedTime}
          </Text>
        )}

        {/* Failure Reason Card */}
        <View
          className="rounded-xl p-4 mb-4"
          style={{
            backgroundColor: `${errorColor}10`,
            borderWidth: 1,
            borderColor: `${errorColor}30`,
          }}
        >
          <View className="flex-row items-start mb-2">
            <Ionicons
              name="alert-circle"
              size={20}
              color={errorColor}
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <Text
              className="text-sm font-semibold flex-1"
              style={{ color: errorColor }}
            >
              Error Details
            </Text>
          </View>
          <Text
            className="text-sm ml-7 leading-5"
            style={{ color: theme.foreground }}
          >
            {failedEmail.failure_reason || "An unknown error occurred while processing this email."}
          </Text>
        </View>

        {/* Subject Card (if available) */}
        {failedEmail.subject && (
          <View
            className="rounded-xl p-4 mb-4"
            style={{ backgroundColor: theme.card }}
          >
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="mail-outline"
                size={20}
                color={theme.secondary}
                style={{ marginRight: 8 }}
              />
              <Text
                className="text-xs font-medium"
                style={{ color: theme.secondary }}
              >
                SUBJECT
              </Text>
            </View>
            <Text
              className="text-base"
              style={{ color: theme.foreground }}
            >
              {failedEmail.subject}
            </Text>
          </View>
        )}

        {/* Sender Card */}
        {failedEmail.sender_email && (
          <View
            className="rounded-xl p-4 mb-4"
            style={{ backgroundColor: theme.card }}
          >
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: `${theme.secondary}30` }}
              >
                <Ionicons name="person-outline" size={24} color={theme.secondary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-xs font-medium mb-1"
                  style={{ color: theme.secondary }}
                >
                  SENDER
                </Text>
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.foreground }}
                  numberOfLines={1}
                >
                  {senderName}
                </Text>
                {businessName && (
                  <Text
                    className="text-sm"
                    style={{ color: theme.secondary }}
                    numberOfLines={1}
                  >
                    {businessName}
                  </Text>
                )}
              </View>
            </View>
            <View
              className="mt-3 pt-3"
              style={{ borderTopWidth: 1, borderTopColor: theme.border }}
            >
              <Text className="text-sm" style={{ color: theme.secondary }}>
                {failedEmail.sender_email}
              </Text>
            </View>
          </View>
        )}

        {/* Pet Info Card */}
        <View
          className="rounded-xl p-4 mb-4"
          style={{ backgroundColor: theme.card }}
        >
          <View className="flex-row items-center">
            <View
              className="w-12 h-12 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Ionicons name="paw" size={24} color={theme.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-xs font-medium mb-1"
                style={{ color: theme.secondary }}
              >
                PET
              </Text>
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
                numberOfLines={1}
              >
                {petName}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Note */}
        <View
          className="rounded-xl p-4"
          style={{
            backgroundColor: `${theme.secondary}10`,
            borderWidth: 1,
            borderColor: `${theme.secondary}20`,
          }}
        >
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={theme.secondary}
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <Text
              className="text-sm flex-1 leading-5"
              style={{ color: theme.secondary }}
            >
              If this email contained important documents, please ask the sender
              to resend it or upload the documents manually through the app.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom spacing for consistency */}
      {/* <View
        className="px-4 py-4 border-t"
        style={{
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        }}
      >
        <TouchableOpacity
          className="rounded-full py-4 items-center justify-center"
          style={{
            backgroundColor: "transparent",
            borderWidth: 2,
            borderColor: theme.border,
          }}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text
            className="font-semibold text-base"
            style={{ color: theme.foreground }}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View> */}
    </View>
  );
}
