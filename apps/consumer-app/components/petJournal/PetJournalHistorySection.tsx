import {
  PetJournalEntryCard,
  type PetJournalTimelineRow,
} from "@/components/petJournal/PetJournalEntryCard";
import { getJournalSurfaceTokens } from "@/components/petJournal/journalSurfaceTokens";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type Props = {
  rows: PetJournalTimelineRow[];
  petName?: string;
  expanded: boolean;
  onToggle: () => void;
  highlightEntryId?: string | null;
  isLoading?: boolean;
  transferHighlights?: React.ReactNode;
};

function rowId(row: PetJournalTimelineRow): string {
  return row.kind === "server" ? row.entry.id : `milo-${row.entry.id}`;
}

function isHighlighted(row: PetJournalTimelineRow, highlightEntryId?: string | null): boolean {
  if (!highlightEntryId) return false;
  if (row.kind === "server") return row.entry.id === highlightEntryId;
  return row.entry.id === highlightEntryId;
}

export function PetJournalHistorySection({
  rows,
  petName,
  expanded,
  onToggle,
  highlightEntryId,
  isLoading = false,
  transferHighlights,
}: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const surfaces = getJournalSurfaceTokens(isDark, theme);

  const latest = rows[0];
  const olderRows = rows.slice(1);
  const olderCount = olderRows.length;

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 24 }} color={theme.primary} />;
  }

  if (rows.length === 0) {
    return (
      <View style={{ paddingVertical: 28, paddingHorizontal: 8 }}>
        <Text style={{ textAlign: "center", color: theme.secondary, fontSize: 15, lineHeight: 22 }}>
          No entries yet. Use Check in with Milo or add a manual note above.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 8 }}>
      {transferHighlights}

      {latest ? (
        <View style={{ marginBottom: olderCount > 0 ? 16 : 0 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              letterSpacing: 0.4,
              color: theme.secondary,
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            Latest note
          </Text>
          <PetJournalEntryCard
            row={latest}
            petName={petName}
            highlighted={isHighlighted(latest, highlightEntryId)}
            variant="featured"
          />
        </View>
      ) : null}

      {olderCount > 0 ? (
        <>
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={
              expanded ? "Collapse journal history" : `Show ${olderCount} older entries`
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 14,
              backgroundColor: surfaces.insetBackground,
              borderWidth: 1,
              borderColor: surfaces.borderColor,
              marginBottom: expanded ? 14 : 0,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="time-outline" size={18} color={theme.primary} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }}>
                History
              </Text>
              <View
                style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.secondary }}>
                  {olderCount}
                </Text>
              </View>
            </View>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.secondary}
            />
          </Pressable>

          {expanded
            ? olderRows.map((row) => (
                <PetJournalEntryCard
                  key={rowId(row)}
                  row={row}
                  petName={petName}
                  highlighted={isHighlighted(row, highlightEntryId)}
                  variant="list"
                />
              ))
            : null}
        </>
      ) : null}
    </View>
  );
}
