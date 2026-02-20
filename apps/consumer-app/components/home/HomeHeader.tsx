import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Image, TouchableOpacity, View } from "react-native";

export default function HomeHeader() {
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <View className="px-4 pt-14 pb-4">
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <View className="flex-row justify-between items-center">
        {/* Logo */}
        <Image
          source={require("@/assets/images/icon.png")}
          style={{ width: 44, height: 44 }}
          resizeMode="contain"
        />

        {/* Right Side - Theme Toggle */}
        <View className="flex-row items-center gap-3">
          {/* Theme Toggle */}
          <TouchableOpacity
            onPress={toggleTheme}
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={mode === "dark" ? "moon" : "sunny"}
              size={20}
              color={theme.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

