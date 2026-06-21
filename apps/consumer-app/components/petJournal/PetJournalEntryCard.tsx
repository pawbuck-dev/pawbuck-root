import { JournalEntryInterviewDetail } from "@/components/journalInterview/JournalEntryInterviewDetail";
import { JournalNoteText } from "@/components/journal/JournalNoteText";
import { getJournalSurfaceTokens } from "@/components/petJournal/journalSurfaceTokens";
import { subtypeLabel, type JournalDomain } from "@/constants/petJournal";
import { useTheme } from "@/context/themeContext";
import type { PetJournalEntry } from "@/services/petJournal";
import { deleteJournalEntry, updateJournalEntry } from "@/services/petJournal";
import type { PetLogEntry } from "@/types/petLog";
import { parseInterviewMetadata } from "@/types/journalInterview";
import { formatEntryDateRelative } from "@/utils/journalContinuity";
import { journalEntryNeedsTriageAttention } from "@/utils/journalTriage";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";

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
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editNote, setEditNote] = useState("");

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

  const handleDelete = () => {
    Alert.alert("Delete entry?", "This journal entry will be permanently removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await deleteJournalEntry(journal.id);
            await queryClient.invalidateQueries({ queryKey: ["petJournal"] });
          })();
        },
      },
    ]);
  };

  const handleSaveEdit = () => {
    void (async () => {
      await updateJournalEntry(journal.id, { note: editNote.trim() || null });
      await queryClient.invalidateQueries({ queryKey: ["petJournal"] });
      setEditOpen(false);
    })();
  };

  return (
    <>
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
      <View style={{ flexDirection: "row", gap: 16, marginTop: 10 }}>
        <Pressable
          onPress={() => {
            setEditNote(journal.note ?? "");
            setEditOpen(true);
          }}
          hitSlop={8}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Ionicons name="create-outline" size={14} color={theme.primary} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary }}>Edit</Text>
        </Pressable>
        <Pressable onPress={handleDelete} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="trash-outline" size={14} color="#B91C1C" />
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#B91C1C" }}>Delete</Text>
        </Pressable>
      </View>
      <JournalEntryInterviewDetail
        metadata={parseInterviewMetadata(journal.interview_metadata)}
        showPostVetFeedback={journal.vet_flagged === true}
      />
    </View>
    <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 24 }}>
        <View style={{ backgroundColor: surfaces.cardBackground, borderRadius: 16, padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground, marginBottom: 12 }}>
            Edit note
          </Text>
          <TextInput
            value={editNote}
            onChangeText={setEditNote}
            multiline
            style={{
              borderWidth: 1,
              borderColor: surfaces.borderColor,
              borderRadius: 12,
              padding: 12,
              minHeight: 100,
              color: theme.foreground,
              textAlignVertical: "top",
            }}
          />
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
            <Pressable onPress={() => setEditOpen(false)}>
              <Text style={{ color: theme.secondary, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSaveEdit}>
              <Text style={{ color: theme.primary, fontWeight: "700" }}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}
