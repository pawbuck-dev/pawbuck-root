import BodyTrackerSection, { type BodyTrackerSegment } from "@/components/home/BodyTrackerSection";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

type Props = {
  petId: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  initialSegment?: BodyTrackerSegment;
};

export default function BodyTrackerTeaser({
  petId,
  expanded: expandedProp,
  onExpandedChange,
  initialSegment = "intake",
}: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const [expandedInternal, setExpandedInternal] = useState(false);
  const expanded = expandedProp ?? expandedInternal;

  const setExpanded = (value: boolean) => {
    if (expandedProp === undefined) setExpandedInternal(value);
    onExpandedChange?.(value);
  };

  useEffect(() => {
    if (expandedProp) setExpandedInternal(true);
  }, [expandedProp]);

  if (expanded) {
    return (
      <View style={{ marginBottom: 8 }}>
        <BodyTrackerSection petId={petId} showTitle={false} initialSegment={initialSegment} />
        <Pressable
          onPress={() => setExpanded(false)}
          style={{ alignSelf: "center", paddingVertical: 8, paddingHorizontal: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Collapse body tracker"
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.primary }}>Show less</Text>
        </Pressable>
      </View>
    );
  }

  const borderStyle =
    Platform.OS === "android"
      ? {}
      : {
          borderWidth: 1 as const,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        };

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
      <Pressable
        onPress={() => setExpanded(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          borderRadius: 16,
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
          gap: 12,
          ...borderStyle,
        }}
        accessibilityRole="button"
        accessibilityLabel="Open body tracker"
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDark ? "rgba(56, 189, 189, 0.2)" : "rgba(59, 208, 210, 0.18)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="fitness-outline" size={20} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: theme.foreground }}>Body tracker</Text>
          <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 2 }}>
            Weight, output photos, and quality tags
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={theme.secondary} />
      </Pressable>
    </View>
  );
}

export type { BodyTrackerSegment };
