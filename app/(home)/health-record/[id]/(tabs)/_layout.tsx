import BottomNavBar from "@/components/home/BottomNavBar";
import { useSelectedPet } from "@/context/selectedPetContext";
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
import { Alert, Image, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";

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
  const { pet } = useSelectedPet();
  const segments = useSegments();
  const [activeTab, setActiveTab] = useState<Tab>("vaccinations");

  // Find the pet by ID (convert string param to number)
  const petFromPets = pets.find((p) => p.id.toString() === id);
  const petName = petFromPets?.name || "Pet";

  // Track active tab from route segments
  useEffect(() => {
    const currentTab = segments[segments.length - 1] as Tab;
    const validTabs: Tab[] = ["vaccinations", "medications", "exams", "lab-results"];
    
    if (currentTab && validTabs.includes(currentTab)) {
      setActiveTab(currentTab);
    } else {
      // Default to vaccinations if no valid tab is found
      setActiveTab("vaccinations");
    }
  }, [segments]);

  // Handle add button press based on active tab
  const handleAddPress = () => {
    // Default to vaccinations if activeTab is not set or invalid
    const tab = activeTab || "vaccinations";
    
    switch (tab) {
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
        // Fallback to vaccinations if unknown tab
        router.push(`/health-record/${id}/vaccination-upload-modal`);
        break;
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      {/* Header */}
      <View className="px-6 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          {/* Back Button - Pawbuck Logo */}
          <Pressable
            onPress={() => router.back()}
            className="items-center justify-center active:opacity-70"
          >
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </Pressable>

          {/* Title */}
          <Text
            className="text-xl font-bold"
            style={{ color: theme.foreground }}
          >
            Health Records
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

      {/* Category Navigation Bar */}
      <View className="px-4 pb-2">
        <View 
          className="rounded-2xl px-4 py-2 flex-row justify-between"
          style={{
            backgroundColor: theme.card,
          }}
        >
          {[
            { 
              id: "vaccinations", 
              label: "Vaccines", 
              icon: "needle", 
              iconType: "material" as const,
              iconColor: "#3BD0D2", // Teal
            },
            { 
              id: "medications", 
              label: "Meds", 
              icon: "pill", 
              iconType: "material" as const,
              iconColor: "#A855F7", // Purple
            },
            { 
              id: "exams", 
              label: "Exams", 
              icon: "stethoscope", 
              iconType: "material" as const,
              iconColor: "#60A5FA", // Blue
            },
            { 
              id: "lab-results", 
              label: "Labs", 
              icon: "flask", 
              iconType: "ionicons" as const,
              iconColor: "#FF9500", // Orange
            },
          ].map((category) => {
            const isActive = activeTab === category.id;
            
            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => router.push(`/(home)/health-record/${id}/(tabs)/${category.id}` as any)}
                className="items-center flex-1"
                activeOpacity={0.7}
              >
                <View
                  className="rounded-xl items-center justify-center"
                  style={{
                    backgroundColor: isActive 
                      ? (mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)")
                      : "transparent",
                    borderWidth: isActive ? 1 : 0,
                    borderColor: mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    width: "100%",
                  }}
                >
                  {category.iconType === "material" ? (
                    <MaterialCommunityIcons name={category.icon as any} size={24} color={category.iconColor} />
                  ) : (
                    <Ionicons name={category.icon as any} size={24} color={category.iconColor} />
                  )}
                  <Text
                    className="text-xs font-medium text-center mt-1.5"
                    style={{ color: category.iconColor }}
                  >
                    {category.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Material Top Tabs - Hidden Tab Bar, Content Only */}
      <View className="flex-1">
        <MaterialTopTabs
          initialRouteName="vaccinations"
          tabBarPosition="top"
          screenOptions={{
            swipeEnabled: true,
            tabBarStyle: {
              height: 0,
              opacity: 0,
            },
            tabBarIndicatorStyle: {
              height: 0,
            },
            tabBarShowLabel: false,
            tabBarShowIcon: false,
          }}
        >
        <MaterialTopTabs.Screen
          name="vaccinations"
          options={{ title: "Vaccinations" }}
        />
        <MaterialTopTabs.Screen
          name="medications"
          options={{ title: "Medications" }}
        />
        <MaterialTopTabs.Screen
          name="exams"
          options={{ title: "Exams" }}
        />
        <MaterialTopTabs.Screen
          name="lab-results"
          options={{ title: "Lab Results" }}
        />
      </MaterialTopTabs>
      </View>

      {/* Bottom Navigation Bar */}
      <BottomNavBar activeTab="records" />
    </View>
  );
}
