import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

export default function HomeHeader() {
  const { theme, mode, toggleTheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const getUserInitial = () => {
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

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

        {/* Right Side - Theme Toggle + User Avatar */}
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

          {/* User Avatar */}
          <TouchableOpacity
            onPress={() => router.push("/(home)/settings")}
            activeOpacity={0.7}
            className="relative"
          >
            <View
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{
                backgroundColor: theme.primary,
                borderWidth: 2,
                borderColor: theme.primary,
              }}
            >
              <Text className="text-base font-bold" style={{ color: theme.background }}>
                {getUserInitial()}
              </Text>
            </View>
            {/* Online Indicator */}
            <View
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full"
              style={{
                backgroundColor: "#22C55E",
                borderWidth: 2,
                borderColor: theme.background,
              }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

