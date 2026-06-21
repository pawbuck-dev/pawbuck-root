import type { JournalInterviewMetadata } from "@/types/journalInterview";
import { useTheme } from "@/context/themeContext";
import { humanizeJournalFieldKey } from "@/utils/journalFieldLabels";
import { submitMiloJournalFeedback } from "@/utils/miloChatApi";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type Props = {
  metadata: JournalInterviewMetadata | null | undefined;
  showPostVetFeedback?: boolean;
};

export function JournalEntryInterviewDetail({ metadata, showPostVetFeedback }: Props) {
  const { theme } = useTheme();
  const [feedbackSent, setFeedbackSent] = useState<"up" | "down" | null>(null);

  if (!metadata?.structured_fields || Object.keys(metadata.structured_fields).length === 0) {
    return null;
  }

  const onPostVetFeedback = async (rating: "up" | "down") => {
    const turnId = metadata.turn_id;
    if (!turnId) return;
    try {
      await submitMiloJournalFeedback({
        turnId,
        rating,
        treeVersion: metadata.tree_version,
        feedbackStage: "post_vet",
      });
      setFeedbackSent(rating);
    } catch (e) {
      console.warn("Post-vet feedback failed:", e);
    }
  };

  return (
    <View
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: theme.border,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.secondary, marginBottom: 6 }}>
        STRUCTURED NOTE · {metadata.tree_id}
      </Text>
      {Object.entries(metadata.structured_fields).map(([key, value]) => (
        <View key={key} style={{ marginBottom: 6 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: theme.secondary }}>
            {humanizeJournalFieldKey(key)}
          </Text>
          <Text style={{ fontSize: 13, color: theme.foreground }}>{value}</Text>
        </View>
      ))}
      {metadata.attachment_paths && metadata.attachment_paths.length > 0 ? (
        <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 4 }}>
          {metadata.attachment_paths.length} photo(s) attached
        </Text>
      ) : null}
      {showPostVetFeedback && metadata.turn_id ? (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 12, color: theme.secondary, marginBottom: 6 }}>
            Was this note helpful after your vet visit?
          </Text>
          {feedbackSent ? (
            <Text style={{ fontSize: 12, color: theme.primary }}>Thanks for your feedback.</Text>
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => void onPostVetFeedback("up")}
                accessibilityLabel="Helpful"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: "rgba(0,0,0,0.06)",
                }}
              >
                <Ionicons name="thumbs-up-outline" size={16} color={theme.foreground} />
                <Text style={{ fontSize: 13, color: theme.foreground }}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void onPostVetFeedback("down")}
                accessibilityLabel="Not helpful"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: "rgba(0,0,0,0.06)",
                }}
              >
                <Ionicons name="thumbs-down-outline" size={16} color={theme.foreground} />
                <Text style={{ fontSize: 13, color: theme.foreground }}>No</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
