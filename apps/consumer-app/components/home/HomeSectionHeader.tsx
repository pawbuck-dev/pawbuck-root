import { useTheme } from "@/context/themeContext";
import React from "react";
import { Text, View } from "react-native";

type Props = {
  title: string;
  subtitle?: string;
  style?: { marginBottom?: number; paddingHorizontal?: number };
};

export default function HomeSectionHeader({ title, subtitle, style }: Props) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: style?.paddingHorizontal ?? 20,
        marginBottom: style?.marginBottom ?? 12,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: theme.secondary,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 14, color: theme.secondary, marginTop: 4, lineHeight: 20 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
