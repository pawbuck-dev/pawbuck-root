import { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import PrivateImage from "../PrivateImage";

type NavItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route?: string;
};

type BottomNavBarProps = {
  activeTab?: string;
  selectedPet?: Pet | null;
  onPetAvatarPress?: () => void;
};

export default function BottomNavBar({
  activeTab = "home",
  selectedPet,
  onPetAvatarPress,
}: BottomNavBarProps) {
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  const router = useRouter();

  const navItems: NavItem[] = [
    { id: "home", icon: "home-outline", activeIcon: "home", route: "/(home)/home" },
    { id: "records", icon: "clipboard-outline", activeIcon: "clipboard" },
    { id: "pet", icon: "paw-outline", activeIcon: "paw" }, // Center pet avatar
    { id: "community", icon: "people-outline", activeIcon: "people" },
    { id: "profile", icon: "person-outline", activeIcon: "person", route: "/(home)/settings" },
  ];

  const handleNavPress = (item: NavItem) => {
    if (item.id === "pet" && onPetAvatarPress) {
      onPetAvatarPress();
      return;
    }
    if (item.route) {
      router.push(item.route as any);
    }
  };

  const activeColor = "#3BD0D2";
  const inactiveColor = isDarkMode ? "hsl(215, 20%, 45%)" : "hsl(215, 20%, 55%)";

  return (
    <View className="px-4 pb-6 pt-2">
      <View
        className="flex-row items-center justify-around rounded-3xl overflow-hidden"
        style={{
          backgroundColor: theme.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
          height: 60,
          paddingHorizontal: 16,
          marginBottom: 16,
        }}
      >
        {navItems.map((item) => {
          const isActive = item.id === activeTab;
          const isPetCenter = item.id === "pet";

          if (isPetCenter) {
            // Center Pet Avatar - elevated above the bar
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleNavPress(item)}
                activeOpacity={0.8}
                className="items-center justify-center"
                style={{
                  marginTop: -28,
                }}
              >
                {/* Outer glow ring */}
                <View
                  className="w-[72px] h-[72px] rounded-full items-center justify-center"
                  style={{
                    backgroundColor: theme.card,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 8,
                  }}
                >
                  {/* Border ring with gradient effect */}
                  <LinearGradient
                    colors={["#3BD0D2", "#2BA8AA", "#3BD0D2"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="w-[68px] h-[68px] rounded-full items-center justify-center p-[3px]"
                  >
                    <View
                      className="w-full h-full rounded-full items-center justify-center overflow-hidden"
                      style={{
                        backgroundColor: theme.card,
                      }}
                    >
                      {selectedPet?.photo_url ? (
                        <PrivateImage
                          bucketName="pets"
                          filePath={selectedPet.photo_url}
                          className="w-full h-full rounded-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="paw" size={28} color={activeColor} />
                      )}
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleNavPress(item)}
              activeOpacity={0.7}
              className="items-center justify-center"
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: isActive
                  ? isDarkMode
                    ? "rgba(59, 208, 210, 0.15)"
                    : "rgba(59, 208, 210, 0.12)"
                  : "transparent",
              }}
            >
              <Ionicons
                name={isActive ? item.activeIcon : item.icon}
                size={18}
                color={isActive ? activeColor : inactiveColor}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

