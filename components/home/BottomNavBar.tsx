import { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
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
  const { theme } = useTheme();
  const router = useRouter();

  const navItems: NavItem[] = [
    { id: "home", icon: "home-outline", activeIcon: "home", route: "/(home)/home" },
    { id: "records", icon: "document-text-outline", activeIcon: "document-text" },
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

  return (
    <View
      className="flex-row items-center justify-around py-3 px-4"
      style={{
        backgroundColor: theme.card,
        borderTopWidth: 1,
        borderTopColor: theme.border,
      }}
    >
      {navItems.map((item) => {
        const isActive = item.id === activeTab;
        const isPetCenter = item.id === "pet";

        if (isPetCenter) {
          // Center Pet Avatar
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleNavPress(item)}
              activeOpacity={0.7}
              className="items-center justify-center"
              style={{
                marginTop: -30, // Float above the nav bar
              }}
            >
              <View
                className="w-16 h-16 rounded-full items-center justify-center overflow-hidden"
                style={{
                  backgroundColor: theme.card,
                  borderWidth: 3,
                  borderColor: theme.primary,
                }}
              >
                {selectedPet?.photo_url ? (
                  <PrivateImage
                    bucketName="pets"
                    filePath={selectedPet.photo_url}
                    className="w-14 h-14 rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="paw" size={28} color={theme.primary} />
                )}
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleNavPress(item)}
            activeOpacity={0.7}
            className="items-center justify-center w-12 h-12"
          >
            <Ionicons
              name={isActive ? item.activeIcon : item.icon}
              size={24}
              color={isActive ? theme.primary : theme.secondary}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

