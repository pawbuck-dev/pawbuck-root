import { useTheme } from "@/context/themeContext";
import React, { type ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { getProfileScreenTokens, PROFILE_LIST_ROW_GAP } from "./profileUiTokens";

type ProfileListCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ProfileListCard({ children, style }: ProfileListCardProps) {
  const { theme, mode } = useTheme();
  const t = getProfileScreenTokens(theme, mode === "dark");

  return (
    <View
      style={[
        {
          borderRadius: 20,
          padding: 8,
          gap: PROFILE_LIST_ROW_GAP,
          backgroundColor: t.profileCardBg,
          ...t.profileCardBorderStyle,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
