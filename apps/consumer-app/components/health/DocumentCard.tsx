import { useTheme } from "@/context/themeContext";
import type { Tables } from "@/database.types";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Text, View } from "react-native";

type Props = {
  row: Tables<"pet_documents">;
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

export default function DocumentCard({ row }: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const extracted = useMemo(() => parseExtracted(row.extracted_json), [row.extracted_json]);

  const badge = row.document_type.replace(/_/g, " ");

  return (
    <View
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: theme.foreground }} numberOfLines={2}>
            {extracted.title || "Document"}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: "600", color: theme.primary, marginTop: 4, textTransform: "capitalize" }}>
            {badge}
          </Text>
        </View>
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
      </View>

      {extracted.summary ? (
        <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 8 }} numberOfLines={4}>
          {extracted.summary}
        </Text>
      ) : null}

      {extracted.keyFacts && extracted.keyFacts.length > 0 ? (
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

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
        <Ionicons name="calendar-outline" size={14} color={theme.secondary} />
        <Text style={{ fontSize: 11, color: theme.secondary }}>
          {primaryDateLabel(extracted.primaryDate)}
        </Text>
      </View>
    </View>
  );
}

function primaryDateLabel(primary?: string | null) {
  if (primary) return `Primary date: ${primary}`;
  return "Saved document";
}
