import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
    MaterialTopTabNavigationEventMap,
    MaterialTopTabNavigationOptions,
    createMaterialTopTabNavigator,
} from "@react-navigation/material-top-tabs";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";
import {
    router,
    useLocalSearchParams,
    useSegments,
    withLayoutContext,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

type Tab = "vaccinations" | "medications" | "exams" | "lab-results";

export default function HealthRecordsLayout() {
  const { theme, mode } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pets } = usePets();
  const segments = useSegments();
  const [activeTab, setActiveTab] = useState<Tab>("vaccinations");

  // Find the pet by ID (convert string param to number)
  const pet = pets.find((p) => p.id.toString() === id);
  const petName = pet?.name || "Pet";

  // Track active tab from route segments
  useEffect(() => {
    const currentTab = segments[segments.length - 1] as Tab;
    if (currentTab) {
      setActiveTab(currentTab);
    }
  }, [segments]);

  // Handle add button press based on active tab
  const handleAddPress = () => {
    switch (activeTab) {
      case "vaccinations":
        router.push(`/health-record/${id}/vaccination-upload-modal`);
        break;
      case "medications":
        router.push(`/health-record/${id}/medication-upload-modal`);
        break;
      case "exams":
        router.push(`/health-record/${id}/exam-upload-modal`);
        break;
      case "lab-results":
        router.push(`/health-record/${id}/lab-result-upload-modal`);
        break;
      default:
        console.log("Unknown tab");
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      {/* Header */}
      <View className="px-6 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center active:opacity-70"
          >
            <Ionicons name="arrow-back" size={24} color={theme.foreground} />
          </Pressable>

          {/* Title */}
          <Text
            className="text-xl font-bold"
            style={{ color: theme.foreground }}
          >
            {petName}'s Health Records
          </Text>

          {/* Add Button */}
          <Pressable
            onPress={handleAddPress}
            className="w-10 h-10 items-center justify-center active:opacity-70"
          >
            <Ionicons name="add-circle" size={28} color={theme.primary} />
          </Pressable>
        </View>
      </View>

      {/* Material Top Tabs with Swipe Enabled at Bottom */}
      <MaterialTopTabs
        tabBarPosition="bottom"
        screenOptions={{
          swipeEnabled: true,
          tabBarStyle: {
            backgroundColor: mode === "dark" ? "#1C2128" : "#FFFFFF",
            borderTopWidth: 0.5,
            borderTopColor: mode === "dark" ? "#30363D" : "#E5E7EB",
            height: 85,
            paddingBottom: 20,
            paddingTop: 10,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarIndicatorStyle: {
            height: 0, // Hide the indicator line
          },
          tabBarItemStyle: {
            paddingHorizontal: 0,
          },
          tabBarShowIcon: true,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            textTransform: "none",
            marginTop: 2,
          },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: mode === "dark" ? "#9CA3AF" : "#6B7280",
        }}
      >
        <MaterialTopTabs.Screen
          name="vaccinations"
          options={{
            title: "Vaccinations",
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="needle" size={24} color={color} />
            ),
          }}
        />
        <MaterialTopTabs.Screen
          name="medications"
          options={{
            title: "Medications",
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="pill" size={24} color={color} />
            ),
          }}
        />
        <MaterialTopTabs.Screen
          name="exams"
          options={{
            title: "Exams",
            tabBarIcon: ({ color }) => (
              <Ionicons name="clipboard" size={24} color={color} />
            ),
          }}
        />
        <MaterialTopTabs.Screen
          name="lab-results"
          options={{
            title: "Lab Results",
            tabBarIcon: ({ color }) => (
              <Ionicons name="flask" size={24} color={color} />
            ),
          }}
        />
      </MaterialTopTabs>
    </View>
  );
}
