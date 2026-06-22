import { getSettingsSubscreenTokens } from "@/components/layout/settingsSubscreenTokens";
import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { type ReactNode } from "react";
import { Text, View } from "react-native";

type PetProfileFieldRowProps = {
  label: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  ionIcon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  trailing?: ReactNode;
  isLast?: boolean;
};

export function PetProfileFieldRow({
  label,
  icon,
  ionIcon,
  children,
  trailing,
  isLast = false,
}: PetProfileFieldRowProps) {
  const { theme, mode } = useTheme();
  const t = getSettingsSubscreenTokens(theme, mode === "dark");

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: t.borderSubtle,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: t.iconWellBg,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        {icon ? (
          <MaterialCommunityIcons name={icon} size={20} color={t.iconFg} />
        ) : ionIcon ? (
          <Ionicons name={ionIcon} size={20} color={t.iconFg} />
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontFamily: "Poppins_400Regular",
            fontSize: 13,
            color: t.muted,
            marginBottom: 4,
          }}
        >
          {label}
        </Text>
        {children}
      </View>
      {trailing ? <View style={{ marginLeft: 8, alignSelf: "center" }}>{trailing}</View> : null}
    </View>
  );
}

export function PetProfileLockedBadge() {
  const { theme, mode } = useTheme();
  const t = getSettingsSubscreenTokens(theme, mode === "dark");

  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: t.lockedBadgeBg,
      }}
    >
      <Text
        style={{
          fontFamily: "Poppins_400Regular",
          fontSize: 11,
          color: t.muted,
        }}
      >
        Locked
      </Text>
    </View>
  );
}
