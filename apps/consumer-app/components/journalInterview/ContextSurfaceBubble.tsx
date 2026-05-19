import type { JournalContextSurface } from "@/types/journalInterview";
import { useTheme } from "@/context/themeContext";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type Props = {
  petName: string;
  intro: string;
  surface: JournalContextSurface;
  onAction: (actionId: string, label: string) => void;
};

export function ContextSurfaceBubble({ petName, intro, surface, onAction }: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  return (
    <View
      style={{
        marginLeft: 56,
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        maxWidth: "92%",
      }}
    >
      <Text style={{ fontSize: 15, color: theme.foreground, lineHeight: 22 }}>{intro}</Text>
      {surface.lines.map((line, i) => (
        <Text key={i} style={{ fontSize: 14, color: theme.foreground, marginTop: 6 }}>
          {line.kind === "ok" ? "✓ " : line.kind === "warn" ? "⚠ " : "· "}
          {line.text}
        </Text>
      ))}
      {surface.adrWarning ? (
        <Text style={{ fontSize: 13, color: "#b45309", marginTop: 8, lineHeight: 18 }}>
          {surface.adrWarning}
        </Text>
      ) : null}
      {surface.puppyGiWarning ? (
        <Text style={{ fontSize: 13, color: "#b45309", marginTop: 8, lineHeight: 18 }}>
          {surface.puppyGiWarning}
        </Text>
      ) : null}
      {surface.brachyWarning ? (
        <Text style={{ fontSize: 13, color: "#b45309", marginTop: 8, lineHeight: 18 }}>
          {surface.brachyWarning}
        </Text>
      ) : null}
      <Text style={{ fontSize: 11, color: theme.secondary, marginTop: 10 }}>
        AI-generated · based on {petName}&apos;s record
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {surface.actions.map((a) => (
          <TouchableOpacity
            key={a.id}
            onPress={() => onAction(a.id, a.label)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: theme.primary,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
