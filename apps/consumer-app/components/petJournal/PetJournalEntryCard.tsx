import { JournalEntryInterviewDetail } from "@/components/journalInterview/JournalEntryInterviewDetail";
import { JournalNoteText } from "@/components/journal/JournalNoteText";
import { getJournalSurfaceTokens } from "@/components/petJournal/journalSurfaceTokens";
import { subtypeLabel, type JournalDomain } from "@/constants/petJournal";
import { useTheme } from "@/context/themeContext";
import type { PetJournalEntry } from "@/services/petJournal";
import type { PetLogEntry } from "@/types/petLog";
import { parseInterviewMetadata } from "@/types/journalInterview";
import { formatEntryDateRelative } from "@/utils/journalContinuity";
import { journalEntryNeedsTriageAttention } from "@/utils/journalTriage";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

export type PetJournalTimelineRow =
  | { kind: "server"; entry: PetJournalEntry }
  | { kind: "milo"; entry: PetLogEntry };

type Props = {
  row: PetJournalTimelineRow;
  petName?: string;
  highlighted?: boolean;
  /** `featured` — hero card for the latest note. `list` — history rows. */
  variant?: "featured" | "list";
};

function domainIcon(d: JournalDomain): React.ComponentProps<typeof Ionicons>["name"] {
  if (d === "health") return "medkit-outline";
  if (d === "behavioral") return "paw-outline";
  return "globe-outline";
}

function severityColor(severity: PetLogEntry["severity"]): string {
  if (severity === "urgent") return "#b91c1c";
  if (severity === "high") return "#c2410c";
  if (severity === "medium") return "#b45309";
  return "#15803d";
}

export function PetJournalEntryCard({
  row,
  petName,
  highlighted = false,
  variant = "list",
}: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const surfaces = getJournalSurfaceTokens(isDark, theme);
  const isFeatured = variant === "featured";

  const noteSize = isFeatured ? 19 : 17;
  const noteLineHeight = isFeatured ? 28 : 25;
  const padding = isFeatured ? 20 : 16;
  const borderRadius = isFeatured ? 20 : 16;

  if (row.kind === "milo") {
    const e = row.entry;
    const sevColor = severityColor(e.severity);
    const dateLabel = formatEntryDateRelative(e.created_at.slice(0, 10));

    return (
      <View
        style={{
          backgroundColor: surfaces.cardBackground,
          borderRadius,
          padding,
          marginBottom: isFeatured ? 0 : 12,
          borderWidth: highlighted ? 2 : 1,
          borderColor: highlighted ? theme.primary : surfaces.borderColor,
        }}
      >
        {e.note ? (
          <JournalNoteText
            text={e.note}
            petName={petName}
            style={{ fontSize: noteSize, lineHeight: noteLineHeight, fontWeight: isFeatured ? "600" : "400" }}
          />
        ) : null}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            marginTop: e.note ? 14 : 0,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="sparkles" size={14} color={theme.primary} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.secondary }}>
              Milo · {e.severity}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.secondary }}>{dateLabel}</Text>
          <View
            style={{
              backgroundColor: `${sevColor}22`,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "600", color: sevColor }}>{e.severity}</Text>
          </View>
        </View>
        <JournalEntryInterviewDetail metadata={parseInterviewMetadata(e.interview_metadata)} />
      </View>
    );
  }

  const journal = row.entry;
  const domain = journal.domain as JournalDomain;
  const subtype = subtypeLabel(domain, journal.subtype);
  const dateLabel = formatEntryDateRelative(journal.entry_date);
  const needsAttention = journalEntryNeedsTriageAttention(journal);

  return (
    <View
      style={{
        backgroundColor: surfaces.cardBackground,
        borderRadius,
        padding,
        marginBottom: isFeatured ? 0 : 12,
        borderWidth: highlighted ? 2 : 1,
        borderColor: highlighted ? theme.primary : surfaces.borderColor,
      }}
    >
      {journal.note ? (
        <JournalNoteText
          text={journal.note}
          petName={petName}
          style={{ fontSize: noteSize, lineHeight: noteLineHeight, fontWeight: isFeatured ? "600" : "400" }}
        />
      ) : (
        <Text
          style={{
            fontSize: noteSize,
            lineHeight: noteLineHeight,
            color: theme.secondary,
            fontStyle: "italic",
          }}
        >
          No note text
        </Text>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name={domainIcon(domain)} size={14} color={theme.primary} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: theme.secondary }}>{subtype}</Text>
        </View>
        <Text style={{ fontSize: 12, color: theme.secondary }}>{dateLabel}</Text>
        {needsAttention ? (
          <View
            style={{
              backgroundColor: "rgba(249,115,22,0.15)",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#C2410C" }}>
              Vet attention
            </Text>
          </View>
        ) : null}
      </View>
      <JournalEntryInterviewDetail
        metadata={parseInterviewMetadata(journal.interview_metadata)}
        showPostVetFeedback={journal.vet_flagged === true}
      />
    </View>
  );
}
