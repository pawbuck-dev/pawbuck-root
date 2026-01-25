import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import { useTheme } from "@/context/themeContext";
import { FailedEmail, getFailedEmailAttachmentPath, getFailedEmailAttachments } from "@/services/failedEmails";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

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
  const [expandedSections, setExpandedSections] = useState<{
    fields: boolean;
    matches: boolean;
    mismatches: boolean;
  }>({
    fields: false,
    matches: false,
    mismatches: false,
  });
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  const [loadingAttachment, setLoadingAttachment] = useState(false);
  const [attachmentAvailable, setAttachmentAvailable] = useState<boolean | null>(null);
  const [attachments, setAttachments] = useState<Array<{ index: number; filename: string; mimeType: string; size: number }>>([]);
  const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState<number | null>(null);

  const petName = failedEmail.pets?.name || "Unknown Pet";
  const hasAttachment = !!failedEmail.s3_key;

  // Load attachment path when component mounts if s3_key is available
  useEffect(() => {
    if (hasAttachment && failedEmail.s3_key) {
      loadAttachmentPath();
    }
  }, [failedEmail.s3_key]);

  const loadAttachmentPath = async () => {
    if (!failedEmail.s3_key) return;
    
    setLoadingAttachment(true);
    try {
      // First, get list of all attachments
      const attachmentsList = await getFailedEmailAttachments(failedEmail.s3_key);
      if (attachmentsList && attachmentsList.length > 0) {
        setAttachments(attachmentsList);
        setAttachmentAvailable(true);
        // Load first attachment by default
        const firstPath = await getFailedEmailAttachmentPath(failedEmail.s3_key, 0);
        if (firstPath) {
          setAttachmentPath(firstPath);
          setSelectedAttachmentIndex(0);
        }
      } else {
        setAttachmentAvailable(false);
      }
    } catch (error) {
      console.error("Error loading attachments:", error);
      setAttachmentAvailable(false);
    } finally {
      setLoadingAttachment(false);
    }
  };

  const handleSelectAttachment = async (index: number) => {
    if (!failedEmail.s3_key) return;
    
    setLoadingAttachment(true);
    try {
      const path = await getFailedEmailAttachmentPath(failedEmail.s3_key, index);
      if (path) {
        setAttachmentPath(path);
        setSelectedAttachmentIndex(index);
        setShowDocumentViewer(true);
      } else {
        setAttachmentAvailable(false);
        Alert.alert(
          "Attachment Unavailable",
          "The document attachment could not be retrieved. This may occur if the email was from a known sender and wasn't stored, or if the stored email data has been deleted."
        );
      }
    } catch (error) {
      setAttachmentAvailable(false);
      Alert.alert(
        "Error",
        "Failed to load the document. Please try again later."
      );
    } finally {
      setLoadingAttachment(false);
    }
  };

  // Parse error message to extract structured information
  const parseErrorDetails = (errorMessage: string) => {
    const details = {
      confidence: null as number | null,
      matchedFields: [] as string[],
      mismatchedFields: [] as string[],
      missingFields: [] as string[],
      recommendation: null as string | null,
    };

    // Extract confidence percentage
    const confidenceMatch = errorMessage.match(/Overall confidence: (\d+)%/);
    if (confidenceMatch) {
      details.confidence = parseInt(confidenceMatch[1], 10);
    }

    // Extract recommendation
    const recommendationMatch = errorMessage.match(/\(([^)]+)\)/);
    if (recommendationMatch) {
      details.recommendation = recommendationMatch[1];
    }

    // Extract matched fields
    const matchedMatch = errorMessage.match(/Matched: ([^.]+)/);
    if (matchedMatch) {
      details.matchedFields = matchedMatch[1].split(", ").filter(Boolean);
    }

    // Extract mismatched fields
    const mismatchPatterns = [
      /Multiple mismatches found: ([^.]+)/,
      /([^:]+) mismatch[^.]*/,
      /([^:]+) is close[^.]*/,
      /([^:]+) partial match[^.]*/,
    ];
    for (const pattern of mismatchPatterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        const mismatches = match[1].split(", ").filter(Boolean);
        details.mismatchedFields.push(...mismatches);
        break;
      }
    }

    // Extract missing fields
    const missingMatch = errorMessage.match(/Missing: ([^.]+)/);
    if (missingMatch) {
      details.missingFields = missingMatch[1].split(", ").filter(Boolean);
    }

    return details;
  };

  const errorDetails = failedEmail.failure_reason
    ? parseErrorDetails(failedEmail.failure_reason)
    : null;

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
            className="text-sm ml-7 leading-5 mb-3"
            style={{ color: theme.foreground }}
          >
            {failedEmail.failure_reason || "An unknown error occurred while processing this email."}
          </Text>

          {/* Confidence Score */}
          {errorDetails && errorDetails.confidence !== null && (
            <View
              className="ml-7 mt-2 p-2 rounded-lg"
              style={{ backgroundColor: theme.card }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-medium" style={{ color: theme.secondary }}>
                  Validation Confidence
                </Text>
                <Text
                  className="text-sm font-bold"
                  style={{
                    color:
                      errorDetails.confidence >= 70
                        ? "#22C55E"
                        : errorDetails.confidence >= 50
                        ? "#F59E0B"
                        : errorColor,
                  }}
                >
                  {errorDetails.confidence}%
                </Text>
              </View>
              {errorDetails.recommendation && (
                <Text className="text-xs mt-1" style={{ color: theme.secondary }}>
                  {errorDetails.recommendation}
                </Text>
              )}
            </View>
          )}

          {/* Expandable Sections */}
          {errorDetails && 
           ((errorDetails.matchedFields?.length > 0) ||
            errorDetails.mismatchedFields?.length > 0 ||
            errorDetails.missingFields?.length > 0) && (
            <View className="ml-7 mt-3">
              {/* Matched Fields */}
              {errorDetails.matchedFields && errorDetails.matchedFields.length > 0 && (
                <TouchableOpacity
                  onPress={() =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      matches: !prev.matches,
                    }))
                  }
                  className="mb-2"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#22C55E"
                        style={{ marginRight: 6 }}
                      />
                      <Text className="text-xs font-medium" style={{ color: theme.foreground }}>
                        Matched Fields ({errorDetails.matchedFields.length})
                      </Text>
                    </View>
                    <Ionicons
                      name={expandedSections.matches ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={theme.secondary}
                    />
                  </View>
                  {expandedSections.matches && (
                    <View className="mt-1 pl-5">
                      {errorDetails.matchedFields.map((field, idx) => (
                        <Text
                          key={idx}
                          className="text-xs mb-1"
                          style={{ color: theme.secondary }}
                        >
                          • {field}
                        </Text>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Mismatched Fields */}
              {errorDetails.mismatchedFields && errorDetails.mismatchedFields.length > 0 && (
                <TouchableOpacity
                  onPress={() =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      mismatches: !prev.mismatches,
                    }))
                  }
                  className="mb-2"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color={errorColor}
                        style={{ marginRight: 6 }}
                      />
                      <Text className="text-xs font-medium" style={{ color: theme.foreground }}>
                        Mismatched Fields ({errorDetails.mismatchedFields.length})
                      </Text>
                    </View>
                    <Ionicons
                      name={expandedSections.mismatches ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={theme.secondary}
                    />
                  </View>
                  {expandedSections.mismatches && (
                    <View className="mt-1 pl-5">
                      {errorDetails.mismatchedFields.map((field, idx) => (
                        <Text
                          key={idx}
                          className="text-xs mb-1"
                          style={{ color: errorColor }}
                        >
                          • {field}
                        </Text>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Missing Fields */}
              {errorDetails.missingFields && errorDetails.missingFields.length > 0 && (
                <View>
                  <View className="flex-row items-center mb-1">
                    <Ionicons
                      name="help-circle"
                      size={16}
                      color={theme.secondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text className="text-xs font-medium" style={{ color: theme.foreground }}>
                      Missing Fields ({errorDetails.missingFields.length})
                    </Text>
                  </View>
                  <View className="pl-5">
                    {errorDetails.missingFields.map((field, idx) => (
                      <Text
                        key={idx}
                        className="text-xs mb-1"
                        style={{ color: theme.secondary }}
                      >
                        • {field}
                      </Text>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
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

        {/* View Attachments Section - Show all attachments */}
        {hasAttachment && attachmentAvailable !== false && attachments.length > 0 && (
          <View className="mb-4">
            <Text className="text-sm font-medium mb-3" style={{ color: theme.secondary }}>
              Attachments ({attachments.length})
            </Text>
            {attachments.map((att, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleSelectAttachment(index)}
                disabled={loadingAttachment}
                className="rounded-xl p-4 mb-2 flex-row items-center justify-between"
                style={{
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: selectedAttachmentIndex === index ? theme.primary : theme.border,
                  opacity: loadingAttachment ? 0.6 : 1,
                }}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: `${theme.primary}20` }}
                  >
                    {loadingAttachment && selectedAttachmentIndex === index ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons name="document-text" size={24} color={theme.primary} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-base font-semibold mb-1"
                      style={{ color: theme.foreground }}
                      numberOfLines={1}
                    >
                      {att.filename}
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: theme.secondary }}
                    >
                      {att.mimeType} • {(att.size / 1024).toFixed(1)} KB
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

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
            <View className="flex-1">
              <Text
                className="text-sm leading-5 mb-2"
                style={{ color: theme.secondary }}
              >
                {errorDetails && errorDetails.confidence !== null && errorDetails.confidence >= 50
                  ? "The document information doesn't fully match your pet's profile. You can upload this document manually through the app, and we'll help you review and add the information."
                  : errorDetails && errorDetails.missingFields && errorDetails.missingFields.length > 0
                  ? `The document is missing ${errorDetails.missingFields.length === 1 ? "a required field" : "required fields"} (${errorDetails.missingFields.join(", ")}). Please upload the document manually through the app to review and add the information.`
                  : "The document couldn't be automatically processed. Please upload it manually through the app to review and add the information to your pet's health records."}
              </Text>
              <Text
                className="text-xs leading-4 mt-1"
                style={{ color: theme.secondary, opacity: 0.8 }}
              >
                Tip: When uploading manually, you can review and confirm all the details before saving.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Document Viewer Modal */}
      {hasAttachment && attachmentPath && selectedAttachmentIndex !== null && attachments.length > 0 && (
        <DocumentViewerModal
          visible={showDocumentViewer}
          onClose={() => setShowDocumentViewer(false)}
          documentPath={attachmentPath}
          title={attachments[selectedAttachmentIndex]?.filename || "Email Attachment"}
        />
      )}

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
