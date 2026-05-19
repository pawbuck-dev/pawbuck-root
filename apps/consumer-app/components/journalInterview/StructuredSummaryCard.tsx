import type { JournalStructuredSummary } from "@/types/journalInterview";
import { useTheme } from "@/context/themeContext";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type Props = {
  petName: string;
  summary: JournalStructuredSummary;
  onConfirm: () => void;
  onEdit?: () => void;
  onAttachPhoto?: () => void;
  attachmentCount?: number;
};

export function StructuredSummaryCard({
  petName,
  summary,
  onConfirm,
  onEdit,
  onAttachPhoto,
  attachmentCount = 0,
}: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  return (
    <View
      style={{
        marginLeft: 56,
        marginBottom: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#fff",
        maxWidth: "92%",
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "700", color: theme.foreground, marginBottom: 8 }}>
        Here&apos;s the draft for {petName}
      </Text>
      {summary.lowConfidence ? (
        <Text style={{ fontSize: 12, color: "#b45309", marginBottom: 8 }}>
          Please review carefully — confidence is below our usual threshold.
        </Text>
      ) : null}
      {Object.entries(summary.fields).map(([key, value]) => (
        <View key={key} style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: theme.secondary, letterSpacing: 0.5 }}>
            {key}
          </Text>
          <Text style={{ fontSize: 14, color: theme.foreground, marginTop: 2 }}>{value}</Text>
        </View>
      ))}
      {summary.redFlags && summary.redFlags.length > 0 ? (
        <Text style={{ fontSize: 13, color: "#b91c1c", marginTop: 4 }}>
          Red flags: {summary.redFlags.join("; ")}
        </Text>
      ) : null}
      <Text style={{ fontSize: 11, color: theme.secondary, marginTop: 10 }}>
        AI-drafted draft · not a diagnosis
      </Text>
      {summary.attachmentHint && onAttachPhoto ? (
        <TouchableOpacity onPress={onAttachPhoto} style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 13, color: theme.primary, fontWeight: "600" }}>
            {attachmentCount > 0 ? `${attachmentCount} photo(s) attached · Add another` : "Attach a photo (optional)"}
          </Text>
        </TouchableOpacity>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <TouchableOpacity
          onPress={onConfirm}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: theme.primary,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Looks right — save</Text>
        </TouchableOpacity>
        {onEdit ? (
          <TouchableOpacity
            onPress={onEdit}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.primary,
            }}
          >
            <Text style={{ color: theme.primary, fontWeight: "600" }}>Edit</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
