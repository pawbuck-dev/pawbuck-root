import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { FailedEmail, getFailedEmailAttachmentPath, getFailedEmailAttachments } from "@/services/failedEmails";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import moment from "moment";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const { pets } = usePets();
  const router = useRouter();
  
  // Get full pet info including breed
  const pet = pets.find((p) => p.id === failedEmail.pet_id);
  const petName = pet?.name || failedEmail.pets?.name || "Unknown Pet";
  const petBreed = pet?.breed || failedEmail.pets?.breed || "Unknown Breed";
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

  const hasAttachment = !!failedEmail.s3_key;
  const isMountedRef = useRef(true);

  // Memoize loadAttachmentPath to avoid recreating on every render
  const loadAttachmentPath = useCallback(async () => {
    if (!failedEmail.s3_key) {
      console.log("No s3_key available for failed email");
      return;
    }
    
    // Check if component is still mounted before proceeding
    if (!isMountedRef.current) {
      return;
    }
    
    console.log("Loading attachments for s3_key:", failedEmail.s3_key);
    setLoadingAttachment(true);
    try {
      // First, get list of all attachments
      console.log("Calling getFailedEmailAttachments...");
      const attachmentsList = await getFailedEmailAttachments(failedEmail.s3_key);
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        return;
      }
      
      console.log("Received attachments list:", attachmentsList);
      
      if (attachmentsList && attachmentsList.length > 0) {
        console.log(`Found ${attachmentsList.length} attachment(s)`);
        setAttachments(attachmentsList);
        setAttachmentAvailable(true);
        // Load first attachment by default
        const firstPath = await getFailedEmailAttachmentPath(failedEmail.s3_key, 0);
        
        // Check again before setting state
        if (!isMountedRef.current) {
          return;
        }
        
        if (firstPath) {
          console.log("First attachment path loaded:", firstPath);
          setAttachmentPath(firstPath);
          setSelectedAttachmentIndex(0);
        } else {
          console.log("Failed to load first attachment path");
        }
      } else {
        console.log("No attachments found or attachmentsList is null");
        setAttachmentAvailable(false);
        setAttachments([]);
      }
    } catch (error) {
      // Only update state if component is still mounted
      if (!isMountedRef.current) {
        return;
      }
      
      console.error("Error loading attachments:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      setAttachmentAvailable(false);
      setAttachments([]);
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setLoadingAttachment(false);
      }
    }
  }, [failedEmail.s3_key]);

  // Load attachment path when component mounts if s3_key is available
  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;
    
    if (failedEmail.s3_key) {
      loadAttachmentPath();
    }
    
    // Cleanup: set mounted flag to false when component unmounts
    return () => {
      isMountedRef.current = false;
    };
  }, [failedEmail.s3_key, loadAttachmentPath]);

  const handleSelectAttachment = async (index: number) => {
    if (!failedEmail.s3_key) return;
    
    // Check if component is still mounted
    if (!isMountedRef.current) {
      return;
    }
    
    setLoadingAttachment(true);
    try {
      const path = await getFailedEmailAttachmentPath(failedEmail.s3_key, index);
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        return;
      }
      
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
      // Only update state if component is still mounted
      if (!isMountedRef.current) {
        return;
      }
      
      setAttachmentAvailable(false);
      Alert.alert(
        "Error",
        "Failed to load the document. Please try again later."
      );
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setLoadingAttachment(false);
      }
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

  // Format timestamp - relative time like "Today, 11:38 AM" or "Jan 25, 2026 at 11:22 AM"
  const getFormattedTime = (): string => {
    if (!failedEmail.completed_at) return "";
    const date = moment(failedEmail.completed_at);
    const now = moment();
    
    if (date.isSame(now, 'day')) {
      return `Today, ${date.format("h:mm A")}`;
    } else if (date.isSame(now.clone().subtract(1, 'day'), 'day')) {
      return `Yesterday, ${date.format("h:mm A")}`;
    } else {
      return date.format("MMM D, YYYY [at] h:mm A");
    }
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

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Icon - Large red circle with exclamation mark */}
        <View className="items-center mb-4">
          <View
            className="w-24 h-24 rounded-full items-center justify-center"
            style={{ backgroundColor: `${errorColor}20` }}
          >
            <Ionicons name="alert-circle" size={48} color={errorColor} />
          </View>
        </View>

        {/* Processing Failed Title */}
        <Text
          className="text-2xl font-bold text-center mb-2"
          style={{ color: errorColor }}
        >
          Processing Failed
        </Text>

        {/* Email for Pet • Timestamp */}
        <Text
          className="text-center text-sm mb-6"
          style={{ color: theme.secondary }}
        >
          Email for {petName} • {formattedTime}
        </Text>

        {/* Subject Card */}
        {failedEmail.subject && (
          <View
            className="rounded-xl p-4 mb-3"
            style={{ backgroundColor: theme.card }}
          >
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="menu-outline"
                size={18}
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

        {/* Sender and Patient Card - Combined in single panel */}
        <View
          className="rounded-xl p-4 mb-4"
          style={{ backgroundColor: theme.card }}
        >
          {/* Sender Section */}
          {failedEmail.sender_email && (
            <>
              <TouchableOpacity
                className="flex-row items-center justify-between"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={theme.secondary}
                    style={{ marginRight: 12 }}
                  />
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
                    <Text
                      className="text-sm mt-0.5"
                      style={{ color: theme.secondary }}
                      numberOfLines={1}
                    >
                      {failedEmail.sender_email}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
              </TouchableOpacity>
              
              {/* Divider */}
              <View
                className="h-px my-3"
                style={{ backgroundColor: theme.border }}
              />
            </>
          )}

          {/* Patient Section */}
          <TouchableOpacity
            className="flex-row items-center justify-between"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="paw"
                size={20}
                color={theme.primary}
                style={{ marginRight: 12 }}
              />
              <View className="flex-1">
                <Text
                  className="text-xs font-medium mb-1"
                  style={{ color: theme.secondary }}
                >
                  PATIENT
                </Text>
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.foreground }}
                  numberOfLines={1}
                >
                  {petName}
                </Text>
                <Text
                  className="text-sm mt-0.5"
                  style={{ color: theme.secondary }}
                  numberOfLines={1}
                >
                  {petBreed}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </TouchableOpacity>
        </View>

        {/* View Attachments Section - Show all attachments */}
        {hasAttachment && attachmentAvailable === true && attachments.length > 0 && (
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

        {/* Show message when attachments are not available */}
        {hasAttachment && attachmentAvailable === false && !loadingAttachment && (
          <View className="mb-4 p-4 rounded-xl" style={{ backgroundColor: `${theme.secondary}10`, borderWidth: 1, borderColor: `${theme.secondary}20` }}>
            <View className="flex-row items-start">
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={theme.secondary}
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <View className="flex-1">
                <Text className="text-sm" style={{ color: theme.secondary }}>
                  Attachments are not available for this email. This may occur if the email was from a known sender and wasn't stored, or if the stored email data has been deleted.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Info Note */}
        <View
          className="rounded-xl p-4 mb-4"
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
              color={theme.primary}
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <View className="flex-1">
              <Text
                className="text-sm leading-5"
                style={{ color: theme.foreground }}
              >
                We couldn't automatically extract the health records from this email. This usually happens if the attachment is in an unsupported format or the email content is missing. Don't worry, you can still add these records manually to {petName}'s profile.
              </Text>
            </View>
          </View>
        </View>

        {/* Add Manually Button */}
        <TouchableOpacity
          className="rounded-xl p-4 flex-row items-center justify-center mb-4"
          style={{ backgroundColor: theme.primary }}
          activeOpacity={0.8}
          onPress={() => {
            if (failedEmail.pet_id) {
              // Navigate to health records page for this pet
              router.push(`/(home)/health-record/${failedEmail.pet_id}/(tabs)/vaccinations`);
            } else {
              Alert.alert(
                "Error",
                "Unable to determine which pet this email belongs to."
              );
            }
          }}
        >
          <Ionicons name="add-circle" size={20} color="white" style={{ marginRight: 8 }} />
          <Text className="text-base font-semibold" style={{ color: "white" }}>
            Add Manually
          </Text>
        </TouchableOpacity>
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
