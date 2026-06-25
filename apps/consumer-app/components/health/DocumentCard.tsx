import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import {
  OverflowAction,
  RecordOverflowSheet,
} from "@/components/health/RecordOverflowSheet";
import { useTheme } from "@/context/themeContext";
import type { Tables } from "@/database.types";
import { deletePetDocument } from "@/services/petDocuments";
import { shareStorageDocument } from "@/utils/documentShare";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  row: Tables<"pet_documents">;
  petId: string;
  /** Optional extra lines (e.g. billing amount) shown above the attachment row. */
  footer?: React.ReactNode;
  /** Hide Milo summary/key facts when footer carries the main body (billing list). */
  compactBody?: boolean;
};

type ExtractedFacts = {
  title?: string;
  summary?: string;
  primaryDate?: string | null;
  keyFacts?: { label: string; value: string }[];
  confidenceScore?: number;
};

function parseExtracted(json: Tables<"pet_documents">["extracted_json"]): ExtractedFacts {
  if (json === null || typeof json !== "object") return {};
  const o = json as Record<string, unknown>;
  const keyFactsRaw = o.keyFacts;
  const keyFacts = Array.isArray(keyFactsRaw)
    ? keyFactsRaw
        .map((x) => {
          if (!x || typeof x !== "object") return null;
          const r = x as Record<string, unknown>;
          const label = typeof r.label === "string" ? r.label : "";
          const value = typeof r.value === "string" ? r.value : "";
          return { label, value };
        })
        .filter(Boolean) as { label: string; value: string }[]
    : [];

  return {
    title: typeof o.title === "string" ? o.title : undefined,
    summary: typeof o.summary === "string" ? o.summary : undefined,
    primaryDate: typeof o.primaryDate === "string" ? o.primaryDate : null,
    keyFacts,
    confidenceScore: typeof o.confidenceScore === "number" ? o.confidenceScore : undefined,
  };
}

export default function DocumentCard({ row, petId, footer, compactBody = false }: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const queryClient = useQueryClient();
  const extracted = useMemo(() => parseExtracted(row.extracted_json), [row.extracted_json]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const hasFile = !!row.storage_path?.trim();
  const badge = row.document_type.replace(/_/g, " ");
  const fileLabel = row.mime_type?.includes("pdf") ? "PDF" : "Photo";

  const deleteMutation = useMutation({
    mutationFn: () => deletePetDocument(row),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pet_documents", petId] });
      Alert.alert("Deleted", "Document removed.");
    },
    onError: () => Alert.alert("Error", "Could not delete this document."),
  });

  const handleDelete = () => {
    Alert.alert(
      "Delete document",
      "Remove this document and its extracted details from your pet's records?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  const handleShare = () => {
    if (!hasFile) {
      Alert.alert("Share", "No file is attached to this record.");
      return;
    }
    const base = (extracted.title || badge).replace(/\s+/g, "_");
    void shareStorageDocument(row.storage_path, base);
  };

  const menuActions: OverflowAction[] = [
    ...(hasFile
      ? ([
          { label: "View file", onPress: () => setShowDocumentModal(true) },
          { label: "Share file", onPress: handleShare },
        ] as OverflowAction[])
      : []),
    { label: "Delete", onPress: handleDelete, destructive: true },
  ];

  return (
    <>
      <View
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
          borderRadius: 12,
          padding: 12,
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: theme.foreground }} numberOfLines={2}>
              {extracted.title || "Document"}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: theme.primary,
                marginTop: 4,
                textTransform: "capitalize",
              }}
            >
              {badge}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: theme.primary }}>
                {Math.round(row.confidence)}%
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setMenuOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                styles.overflowBtn,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                },
              ]}
              accessibilityLabel="Document actions"
            >
              <Ionicons name="ellipsis-vertical" size={18} color={theme.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {!compactBody && extracted.summary ? (
          <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 8 }} numberOfLines={4}>
            {extracted.summary}
          </Text>
        ) : null}

        {!compactBody && extracted.keyFacts && extracted.keyFacts.length > 0 ? (
          <View style={{ marginTop: 10, gap: 6 }}>
            {extracted.keyFacts.slice(0, 6).map((kf, i) => (
              <View key={`${kf.label}-${i}`} style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                <Text style={{ fontSize: 16, color: theme.secondary, fontWeight: "600" }}>•</Text>
                <Text style={{ fontSize: 12, color: theme.secondary, flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: theme.foreground }}>{kf.label}: </Text>
                  {kf.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {footer}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
          <Ionicons name="calendar-outline" size={14} color={theme.secondary} />
          <Text style={{ fontSize: 11, color: theme.secondary }}>
            {primaryDateLabel(extracted.primaryDate)}
          </Text>
        </View>

        {hasFile ? (
          <TouchableOpacity
            onPress={() => setShowDocumentModal(true)}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginTop: 12,
              paddingVertical: 10,
              paddingHorizontal: 10,
              borderRadius: 10,
              backgroundColor: isDark ? "rgba(45,212,191,0.12)" : "rgba(13,148,136,0.08)",
            }}
          >
            <Ionicons name="document-attach-outline" size={20} color={theme.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: theme.foreground }}>View attached file</Text>
              <Text style={{ fontSize: 11, color: theme.secondary, marginTop: 2 }}>{fileLabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.secondary} />
          </TouchableOpacity>
        ) : (
          <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 10, fontStyle: "italic" }}>
            No file attached to this record.
          </Text>
        )}
      </View>

      <RecordOverflowSheet visible={menuOpen} onClose={() => setMenuOpen(false)} actions={menuActions} />

      <DocumentViewerModal
        visible={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        documentPath={row.storage_path}
        title={extracted.title || "Document"}
      />
    </>
  );
}

function primaryDateLabel(primary?: string | null) {
  if (primary) return `Primary date: ${primary}`;
  return "Saved document";
}

const styles = StyleSheet.create({
  overflowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
