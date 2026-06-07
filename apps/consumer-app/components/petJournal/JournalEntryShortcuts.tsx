import type { JournalDomain } from "@/constants/petJournal";
import { useTheme } from "@/context/themeContext";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";

type Shortcut = {
  id: string;
  label: string;
  onPress: () => void;
};

type Props = {
  petId: string;
  /** Hero card body uses a dark surface. */
  onDarkSurface?: boolean;
};

export default function JournalEntryShortcuts({ petId, onDarkSurface = false }: Props) {
  const { theme } = useTheme();
  const router = useRouter();
  const muted = onDarkSurface ? "rgba(255,255,255,0.55)" : theme.secondary;
  const link = onDarkSurface ? "rgba(255,255,255,0.92)" : theme.foreground;

  const openJournal = useCallback(() => {
    router.push({
      pathname: "/(home)/pet-journal",
      params: { petId },
    } as any);
  }, [petId, router]);

  const openNewEntry = useCallback(
    (domain: JournalDomain, subtype: string) => {
      router.push({
        pathname: "/(home)/pet-journal/new",
        params: { petId, domain, subtype },
      } as any);
    },
    [petId, router]
  );

  const shortcuts: Shortcut[] = useMemo(
    () => [
      { id: "symptom", label: "Symptom", onPress: () => openNewEntry("health", "symptom") },
      { id: "appetite", label: "Appetite", onPress: () => openNewEntry("health", "diet") },
      { id: "mood", label: "Mood", onPress: () => openNewEntry("health", "mood") },
      { id: "more", label: "More", onPress: openJournal },
    ],
    [openJournal, openNewEntry]
  );

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        marginTop: 12,
      }}
      accessibilityRole="toolbar"
      accessibilityLabel="Add a manual journal note"
    >
      <Text style={{ fontSize: 12, color: muted, marginRight: 4 }}>Or log manually:</Text>
      {shortcuts.map((shortcut, index) => (
        <React.Fragment key={shortcut.id}>
          {index > 0 ? (
            <Text style={{ fontSize: 13, color: muted, paddingHorizontal: 2 }}>·</Text>
          ) : null}
          <Pressable
            onPress={shortcut.onPress}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Add ${shortcut.label}`}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: link }}>
              {shortcut.label}
            </Text>
          </Pressable>
        </React.Fragment>
      ))}
    </View>
  );
}
