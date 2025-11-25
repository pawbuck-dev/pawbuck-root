import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Pressable, View } from "react-native";

const Header = () => {
  const { theme, mode, toggleTheme } = useTheme();
  return (
    <View className="px-6 pt-14 pb-4">
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <View className="flex-row justify-between items-center">
        {/* Paw Icon */}
        <Pressable
          onPress={() => router.back()}
          className="w-12 h-12 items-center justify-center active:opacity-70"
        >
          <Ionicons name="paw" size={28} color={theme.primary} />
        </Pressable>

        {/* Theme Toggle */}
        <Pressable
          onPress={toggleTheme}
          className="w-12 h-12 items-center justify-center active:opacity-70"
        >
          <Ionicons
            name={mode === "dark" ? "sunny" : "moon"}
            size={24}
            color={mode === "dark" ? "#9CA3AF" : "#6B7280"}
          />
        </Pressable>
      </View>
    </View>
  );
};

export default Header;
