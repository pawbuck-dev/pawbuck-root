import { useEmailApproval } from "@/context/emailApprovalContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
    Linking,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export const EmailApprovalModal: React.FC = () => {
  const { theme, mode } = useTheme();
  const {
    currentApproval,
    isModalVisible,
    isProcessing,
    handleApprove,
    handleApproveAnyway,
    handleReject,
    handleReplyToVet,
  } = useEmailApproval();

  if (!currentApproval) return null;

  const petName = currentApproval.pets?.name || "your pet";
  const isIncorrect = currentApproval.validation_status === "incorrect";
  const validationErrors = currentApproval.validation_errors || {};
  const documentType = currentApproval.document_type;

  // Get document type display name
  const getDocumentTypeName = (type: string | null | undefined): string => {
    if (!type) return "document";
    const typeMap: Record<string, string> = {
      travel_certificate: "Travel Certificate",
      vaccination: "Vaccination Certificate",
      lab_result: "Lab Result",
      exam: "Clinical Exam",
    };
    return typeMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
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

  const errorMessages = getErrorMessages();

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      >
        <View
          className="w-full rounded-3xl"
          style={{ backgroundColor: theme.card, maxWidth: 400, maxHeight: "90%" }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 24 }}
          >
            {/* Header Icon */}
            <View className="items-center mb-4">
              <View className="relative">
                <View
                  className="w-16 h-16 rounded-2xl items-center justify-center"
                  style={{
                    backgroundColor: isIncorrect
                      ? `${theme.error}20`
                      : `${theme.primary}20`,
                  }}
                >
                  {isIncorrect ? (
                    <Ionicons
                      name="warning"
                      size={32}
                      color={theme.error}
                    />
                  ) : (
                    <Ionicons name="mail-open-outline" size={32} color={theme.primary} />
                  )}
                </View>
                {/* Notification Badge */}
                <View
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full"
                  style={{ backgroundColor: "#EF4444" }}
                />
              </View>
            </View>

            {/* Title */}
            <Text
              className="text-xl font-bold text-center mb-2"
              style={{ color: theme.foreground }}
            >
              {isIncorrect
                ? "Incorrect Pet Information Detected"
                : "New Vet Email Detected"}
            </Text>

            {/* Document Type Badge (if present) */}
            {documentType && (
              <View className="items-center mb-3">
                <View
                  className="px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: isIncorrect
                      ? `${theme.error}15`
                      : `${theme.primary}15`,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
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
                    <Text
                      className="text-sm flex-1"
                      style={{ color: theme.foreground }}
                    >
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
              className="text-center mb-5 leading-5"
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
                  from a vet not currently in your records.
                </>
              )}
            </Text>

            {/* Attachment Preview (if URL is available) */}
            {currentApproval.attachment_url && (
              <View
                className="rounded-xl p-4 mb-5"
                style={{ backgroundColor: theme.background }}
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
                      if (currentApproval.attachment_url) {
                        Linking.openURL(currentApproval.attachment_url);
                      }
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: theme.primary }}
                    >
                      View
                    </Text>
                  </TouchableOpacity>
                </View>
                {/* Placeholder for attachment preview - can be enhanced to show actual image */}
                <View
                  className="w-full h-32 rounded-lg items-center justify-center"
                  style={{
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderStyle: "dashed",
                  }}
                >
                  <Ionicons
                    name="document-text"
                    size={32}
                    color={theme.secondary}
                  />
                  <Text
                    className="text-xs mt-2"
                    style={{ color: theme.secondary }}
                  >
                    {getDocumentTypeName(documentType)}
                  </Text>
                </View>
              </View>
            )}

            {/* Sender Card */}
            <View
              className="rounded-xl p-4 mb-5"
              style={{ backgroundColor: theme.background }}
            >
              <View className="flex-row items-center">
                <View
                  className="w-10 h-10 rounded-lg items-center justify-center mr-3"
                  style={{ backgroundColor: `${theme.secondary}30` }}
                >
                  <Ionicons name="person-outline" size={20} color={theme.secondary} />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    DETECTED SENDER
                  </Text>
                  <Text
                    className="text-base font-semibold"
                    style={{ color: theme.foreground }}
                    numberOfLines={1}
                  >
                    {currentApproval.sender_email}
                  </Text>
                </View>
              </View>
            </View>

            {/* Question (for regular approvals) */}
            {!isIncorrect && (
              <Text
                className="text-center mb-5"
                style={{ color: theme.secondary }}
              >
                Would you like to process this email and add this vet to{" "}
                {petName}'s profile?
              </Text>
            )}

            {/* Action Buttons */}
            {isIncorrect ? (
              <>
                {/* Reply to Vet Button (Primary for incorrect records) */}
                <TouchableOpacity
                  className="rounded-full py-4 mb-3 flex-row items-center justify-center"
                  style={{
                    backgroundColor: theme.primary,
                    borderWidth: 2,
                    borderColor: theme.primary,
                  }}
                  onPress={handleReplyToVet}
                  disabled={isProcessing}
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
                  onPress={handleApproveAnyway}
                  disabled={isProcessing}
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
                  onPress={handleReject}
                  disabled={isProcessing}
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
                  onPress={handleApprove}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={20} color="white" />
                      <Text className="text-white font-semibold ml-2 text-base">
                        Yes, Process & Add Vet
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Reject Button */}
                <TouchableOpacity
                  className="py-4 items-center"
                  onPress={handleReject}
                  disabled={isProcessing}
                >
                  <Text
                    className="text-base font-medium"
                    style={{
                      color: isProcessing ? theme.secondary : theme.foreground,
                    }}
                  >
                    No, Ignore Email
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
