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

  // Extract primary issue and confidence from error message
  const getFailurePreview = (): { primaryIssue: string; confidence: number | null } => {
    const reason = failedEmail.failure_reason;
    if (!reason) return { primaryIssue: "Processing failed", confidence: null };

    // Extract confidence
    const confidenceMatch = reason.match(/Overall confidence: (\d+)%/);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : null;

    // Extract primary issue (first sentence or first mismatch)
    let primaryIssue = reason;
    
    // Try to extract the main issue
    const mismatchPatterns = [
      /([^:]+) mismatch[^.]*/,
      /([^:]+) is close[^.]*/,
      /([^:]+) partial match[^.]*/,
      /Multiple mismatches found: ([^.]*)/,
      /No pet identification found[^.]*/,
      /Microchip number mismatch[^.]*/,
    ];

    for (const pattern of mismatchPatterns) {
      const match = reason.match(pattern);
      if (match) {
        primaryIssue = match[0].trim();
        break;
      }
    }

    // If no specific pattern found, use first sentence
    const firstSentence = reason.split(".")[0];
    if (firstSentence && firstSentence.length < 80) {
      primaryIssue = firstSentence;
    }

    // Truncate if too long
    if (primaryIssue.length > 60) {
      primaryIssue = primaryIssue.substring(0, 57) + "...";
    }

    return { primaryIssue, confidence };
  };

  // Format time ago
  const getTimeAgo = (): string => {
    const completedAt = failedEmail.completed_at;
    if (!completedAt) return "";
    return moment(completedAt).fromNow();
  };

  const senderName = getSenderName();
  const businessName = getBusinessName();
  const { primaryIssue, confidence } = getFailurePreview();
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
              {primaryIssue}
            </Text>
            {confidence !== null && (
              <View
                className="ml-2 px-2 py-0.5 rounded"
                style={{
                  backgroundColor:
                    confidence >= 70
                      ? "rgba(34, 197, 94, 0.15)"
                      : confidence >= 50
                      ? "rgba(245, 158, 11, 0.15)"
                      : accentBgColor,
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{
                    color:
                      confidence >= 70
                        ? "#22C55E"
                        : confidence >= 50
                        ? "#F59E0B"
                        : accentColor,
                  }}
                >
                  {confidence}%
                </Text>
              </View>
            )}
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
