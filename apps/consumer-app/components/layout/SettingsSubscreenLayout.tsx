import BottomNavBar from "@/components/home/BottomNavBar";
import { useTheme } from "@/context/themeContext";
import { StatusBar } from "expo-status-bar";
import React, { type ReactNode } from "react";
import { ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { SettingsSubscreenHeader } from "./SettingsSubscreenHeader";
import { getSettingsSubscreenTokens } from "./settingsSubscreenTokens";

type SettingsSubscreenLayoutProps = {
  title: string;
  onBack?: () => void;
  children: ReactNode;
  /** Wrap body in ScrollView with standard horizontal padding */
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  showBottomNav?: boolean;
  bottomNavTab?: "home" | "records" | "messages" | "profile";
  /** Sticky footer above bottom nav (e.g. delete button) */
  footer?: ReactNode;
};

export function SettingsSubscreenLayout({
  title,
  onBack,
  children,
  scroll = true,
  contentContainerStyle,
  showBottomNav = true,
  bottomNavTab = "profile",
  footer,
}: SettingsSubscreenLayoutProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const t = getSettingsSubscreenTokens(theme, isDark);

  const body = scroll ? (
    <ScrollView
      className="flex-1"
      style={{ paddingHorizontal: t.contentPaddingH }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[{ paddingBottom: showBottomNav ? (footer ? 24 : 110) : 40 }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1" style={{ paddingHorizontal: t.contentPaddingH }}>
      {children}
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: t.pageBg }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SettingsSubscreenHeader title={title} onBack={onBack} />
      {body}
      {footer}
      {showBottomNav ? <BottomNavBar activeTab={bottomNavTab} /> : null}
    </View>
  );
}
