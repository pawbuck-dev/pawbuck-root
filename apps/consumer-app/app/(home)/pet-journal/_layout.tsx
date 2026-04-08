import { useTheme } from "@/context/themeContext";
import { Stack } from "expo-router";
import React from "react";

export default function PetJournalLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: theme.background },
      }}
    />
  );
}
