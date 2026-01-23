import { useEmailApproval } from "@/context/emailApprovalContext";
import { useTheme } from "@/context/themeContext";
import { PendingApprovalWithPet } from "@/services/pendingEmailApprovals";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface PendingEmailDetailViewProps {
  approval: PendingApprovalWithPet;
  onBack: () => void;
  hideHeader?: boolean;
}

export default function PendingEmailDetailView({
  approval,
  onBack,
  hideHeader = false,
}: PendingEmailDetailViewProps) {
  const { theme } = useTheme();
  const { handleApprove, handleApproveAnyway, handleReject, refreshPendingApprovals } =
    useEmailApproval();
  const [isProcessing, setIsProcessing] = useState(false);

  const petName = approval.pets?.name || "your pet";
  const isIncorrect = approval.validation_status === "incorrect";
  const validationErrors = approval.validation_errors || {};
  const documentType = approval.document_type;

  // Get document type display name
  const getDocumentTypeName = (type: string | null | undefined): string => {
    if (!type) return "document";
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

  // Get error messages
  const getErrorMessages = (): string[] => {
    const messages: string[] = [];
    if (validationErrors.microchip_number) {
      messages.push("Microchip number doesn't match");
    }
    if (validationErrors.pet_name) {
      messages.push("Pet name doesn't match");
    }
    // Add more error types as needed
    Object.keys(validationErrors).forEach((key) => {
      if (!["microchip_number", "pet_name"].includes(key)) {
        messages.push(`${key.replace(/_/g, " ")} doesn't match`);
      }
    });
    return messages;
  };

  // Get sender display name
  const getSenderName = (): string => {
    const email = approval.sender_email || "";
    const namePart = email.split("@")[0];
    return namePart
      .split(/[._-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get business/clinic name
  const getBusinessName = (): string => {
    const email = approval.sender_email || "";
    const domain = email.split("@")[1]?.split(".")[0] || "";
    const business =
      domain.charAt(0).toUpperCase() + domain.slice(1).replace(/[-_]/g, " ");
    return business.length > 30 ? business.substring(0, 27) + "..." : business;
  };

  const errorMessages = getErrorMessages();
  const senderName = getSenderName();
  const businessName = getBusinessName();

  // Handle approve action
  const onApprove = async () => {
    setIsProcessing(true);
    try {
      await handleApprove();
      await refreshPendingApprovals();
      onBack();
    } catch (error) {
      console.error("Error approving email:", error);
      Alert.alert("Error", "Failed to approve email. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle approve anyway action
  const onApproveAnyway = async () => {
    setIsProcessing(true);
    try {
      await handleApproveAnyway();
      await refreshPendingApprovals();
      onBack();
    } catch (error) {
      console.error("Error approving email:", error);
      Alert.alert("Error", "Failed to approve email. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reject action
  const onReject = async () => {
    setIsProcessing(true);
    try {
      await handleReject();
      await refreshPendingApprovals();
      onBack();
    } catch (error) {
      console.error("Error rejecting email:", error);
      Alert.alert("Error", "Failed to reject email. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reply to vet
  const onReplyToVet = async () => {
    const senderEmail = approval.sender_email;

    // Build error message based on validation errors
    let errorDetails = "";
    if (approval.validation_errors) {
      const errors = Object.keys(approval.validation_errors);
      if (errors.includes("microchip_number")) {
        errorDetails = `I noticed that the microchip number on the ${approval.document_type || "document"} doesn't match the records for ${petName}. `;
      }
      if (errors.includes("pet_name")) {
        errorDetails += errorDetails ? "Also, " : "";
        errorDetails += `the pet name doesn't match our records. `;
      }
    } else {
      errorDetails = `I noticed some information on the ${approval.document_type || "document"} doesn't match the records for ${petName}. `;
    }

    const subject = `Regarding ${petName}'s ${approval.document_type || "document"}`;
    const body = `Hi,\n\n${errorDetails}Could you please verify and confirm the correct information?\n\nThank you,\n[Your Name]`;

    const mailtoUrl = `mailto:${senderEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert("Error", "No email app is available on this device.");
      }
    } catch (error) {
      console.error("Error opening email client:", error);
      Alert.alert("Error", "Failed to open email client. Please try again.");
    }
  };

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
              Pending Email
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
            style={{ color: theme.foreground }}
            numberOfLines={1}
          >
            {isIncorrect ? "Review Required" : "Pending Approval"}
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
        {/* Status Icon */}
        <View className="items-center mb-6">
          <View
            className="w-20 h-20 rounded-2xl items-center justify-center"
            style={{
              backgroundColor: isIncorrect
                ? `${theme.error}20`
                : `${theme.primary}20`,
            }}
          >
            {isIncorrect ? (
              <Ionicons name="warning" size={40} color={theme.error} />
            ) : (
              <Ionicons name="mail-open-outline" size={40} color={theme.primary} />
            )}
          </View>
        </View>

        {/* Title */}
        <Text
          className="text-xl font-bold text-center mb-2"
          style={{ color: theme.foreground }}
        >
          {isIncorrect
            ? "Incorrect Pet Information Detected"
            : "New Email Detected"}
        </Text>

        {/* Document Type Badge */}
        {documentType && (
          <View className="items-center mb-4">
            <View
              className="px-4 py-2 rounded-full"
              style={{
                backgroundColor: isIncorrect
                  ? `${theme.error}15`
                  : `${theme.primary}15`,
              }}
            >
              <Text
                className="text-sm font-semibold"
                style={{
                  color: isIncorrect ? theme.error : theme.primary,
                }}
              >
                {getDocumentTypeName(documentType)}
              </Text>
            </View>
          </View>
        )}

        {/* Error Messages (for incorrect records) */}
        {isIncorrect && errorMessages.length > 0 && (
          <View
            className="rounded-xl p-4 mb-4"
            style={{
              backgroundColor: `${theme.error}10`,
              borderWidth: 1,
              borderColor: `${theme.error}30`,
            }}
          >
            <View className="flex-row items-start mb-2">
              <Ionicons
                name="alert-circle"
                size={20}
                color={theme.error}
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <Text
                className="text-sm font-semibold flex-1"
                style={{ color: theme.error }}
              >
                The following information doesn't match our records:
              </Text>
            </View>
            {errorMessages.map((message, index) => (
              <View key={index} className="flex-row items-center mt-2 ml-7">
                <View
                  className="w-1.5 h-1.5 rounded-full mr-2"
                  style={{ backgroundColor: theme.error }}
                />
                <Text className="text-sm flex-1" style={{ color: theme.foreground }}>
                  {message}
                </Text>
              </View>
            ))}
            <Text
              className="text-xs mt-3 ml-7"
              style={{ color: theme.secondary, fontStyle: "italic" }}
            >
              Please verify with the vet before processing this document.
            </Text>
          </View>
        )}

        {/* Description */}
        <Text
          className="text-center mb-6 leading-5"
          style={{ color: theme.secondary }}
        >
          {isIncorrect ? (
            <>
              We've received a{" "}
              <Text style={{ color: theme.foreground, fontWeight: "600" }}>
                {getDocumentTypeName(documentType)}
              </Text>{" "}
              for{" "}
              <Text style={{ color: theme.primary, fontWeight: "600" }}>
                {petName}
              </Text>
              , but some information doesn't match our records.
            </>
          ) : (
            <>
              We've received an email for{" "}
              <Text style={{ color: theme.primary, fontWeight: "600" }}>
                {petName}
              </Text>{" "}
              from someone we don’t recognize yet.
            </>
          )}
        </Text>

        {/* Attachment Preview (if URL is available) */}
        {approval.attachment_url && (
          <View
            className="rounded-xl p-4 mb-4"
            style={{ backgroundColor: theme.card }}
          >
            <View className="flex-row items-center mb-3">
              <Ionicons
                name="document-attach"
                size={20}
                color={theme.secondary}
                style={{ marginRight: 8 }}
              />
              <Text
                className="text-xs font-medium flex-1"
                style={{ color: theme.secondary }}
              >
                ATTACHMENT
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (approval.attachment_url) {
                    Linking.openURL(approval.attachment_url);
                  }
                }}
              >
                <Text className="text-xs font-semibold" style={{ color: theme.primary }}>
                  View
                </Text>
              </TouchableOpacity>
            </View>
            <View
              className="w-full h-32 rounded-lg items-center justify-center"
              style={{
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                borderStyle: "dashed",
              }}
            >
              <Ionicons name="document-text" size={32} color={theme.secondary} />
              <Text className="text-xs mt-2" style={{ color: theme.secondary }}>
                {getDocumentTypeName(documentType)}
              </Text>
            </View>
          </View>
        )}

        {/* Sender Card */}
        <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: theme.card }}>
          <View className="flex-row items-center">
            <View
              className="w-12 h-12 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: `${theme.secondary}30` }}
            >
              <Ionicons name="person-outline" size={24} color={theme.secondary} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-medium mb-1" style={{ color: theme.secondary }}>
                DETECTED SENDER
              </Text>
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
                numberOfLines={1}
              >
                {senderName}
              </Text>
              <Text
                className="text-sm"
                style={{ color: theme.secondary }}
                numberOfLines={1}
              >
                {businessName}
              </Text>
            </View>
          </View>
          <View
            className="mt-3 pt-3"
            style={{ borderTopWidth: 1, borderTopColor: theme.border }}
          >
            <Text className="text-sm" style={{ color: theme.secondary }}>
              {approval.sender_email}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View
        className="px-4 py-4 border-t"
        style={{
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        }}
      >
        {isIncorrect ? (
          <>
            {/* Reply to Vet Button (Primary for incorrect records) */}
            <TouchableOpacity
              className="rounded-full py-4 mb-3 flex-row items-center justify-center"
              style={{
                backgroundColor: theme.primary,
              }}
              onPress={onReplyToVet}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <Ionicons name="mail" size={20} color="white" />
              <Text className="text-white font-semibold ml-2 text-base">
                Reply to Vet
              </Text>
            </TouchableOpacity>

            {/* Approve Anyway Button */}
            <TouchableOpacity
              className="rounded-full py-4 mb-3 flex-row items-center justify-center"
              style={{
                backgroundColor: "transparent",
                borderWidth: 2,
                borderColor: theme.primary,
              }}
              onPress={onApproveAnyway}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              {isProcessing ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                  <Text
                    className="font-semibold ml-2 text-base"
                    style={{ color: theme.primary }}
                  >
                    Approve Anyway
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Reject Button */}
            <TouchableOpacity
              className="py-4 items-center"
              onPress={onReject}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <Text
                className="text-base font-medium"
                style={{
                  color: isProcessing ? theme.secondary : theme.foreground,
                }}
              >
                Ignore
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Approve Button */}
            <TouchableOpacity
              className="rounded-full py-4 mb-3 flex-row items-center justify-center"
              style={{ backgroundColor: theme.primary }}
              onPress={onApprove}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2 text-base">
                    Yes, Mark as Safe Sender
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Reject Button */}
            <TouchableOpacity
              className="py-4 items-center"
              onPress={onReject}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <Text
                className="text-base font-medium"
                style={{
                  color: isProcessing ? theme.secondary : theme.foreground,
                }}
              >
                No, Mark as Spam
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
