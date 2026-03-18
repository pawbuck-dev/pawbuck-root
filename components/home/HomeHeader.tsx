import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeHeader() {
  const { theme, mode } = useTheme();
  const { selectedPet } = useSelectedPet();
  const router = useRouter();
  const greeting = useMemo(() => getGreeting(), []);
  const petName = selectedPet?.name ?? "Pet";

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: theme.primary, marginBottom: 2 }}>
            {greeting}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: "700", color: theme.foreground }}>
            {petName}'s Care
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.push("/onboarding/step1")}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
              borderWidth: 1,
              borderColor: mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            }}
          >
            <Ionicons name="add" size={22} color={theme.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(home)/settings" as any)}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
              borderWidth: 1,
              borderColor: mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            }}
          >
            <Ionicons name="settings-outline" size={20} color={theme.foreground} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
