import { useChat } from "@/context/chatContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";

// Milo mascot image
const MILO_AVATAR = require("@/assets/images/milo_gif.gif");

type NavItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route?: string;
};

type BottomNavBarProps = {
  activeTab?: string;
  selectedPetId?: string | null;
};

export default function BottomNavBar({
  activeTab = "home",
  selectedPetId,
}: BottomNavBarProps) {
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  const router = useRouter();
  const pathname = usePathname();
  const { openChat } = useChat();
  const { pets } = usePets();

  // Use provided selectedPetId or fall back to first pet
  const petIdForNavigation = selectedPetId ?? pets[0]?.id;

  const navItems: NavItem[] = [
    { id: "home", icon: "home-outline", activeIcon: "home", route: "/(home)/home" },
    { id: "records", icon: "clipboard-outline", activeIcon: "clipboard", route: "/(home)/health-record/[id]" },
    { id: "milo", icon: "chatbubble-outline", activeIcon: "chatbubble" }, // Center Milo chat
    { id: "messages", icon: "mail-outline", activeIcon: "mail", route: "/(home)/messages" },
    { id: "profile", icon: "settings-outline", activeIcon: "settings", route: "/(home)/settings" },
  ];

  const handleNavPress = (item: NavItem) => {
    if (item.id === "milo") {
      openChat();
      return;
    }
    if (item.route) {
      // Handle dynamic route for health records
      if (item.id === "records") {
        if (petIdForNavigation) {
          router.push(`/(home)/health-record/${petIdForNavigation}` as any);
        }
        return;
      }
      router.push(item.route as any);
    }
  };

  const activeColor = "#3BD0D2";
  const inactiveColor = isDarkMode ? "hsl(215, 20%, 45%)" : "hsl(215, 20%, 55%)";

  return (
    <View className="px-4 pb-6 pt-8">
      <View
        className="flex-row items-center justify-around rounded-3xl"
        style={{
          backgroundColor: theme.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
          height: 46,
          paddingHorizontal: 16,
        }}
      >
        {navItems.map((item) => {
          const isActive = item.id === activeTab || (item.route && pathname === item.route);
          const isMiloCenter = item.id === "milo";

          if (isMiloCenter) {
            // Center Milo Avatar - elevated above the bar
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleNavPress(item)}
                activeOpacity={0.8}
                className="items-center justify-center"
                style={{
                  marginTop: -20,
                }}
              >
                {/* Outer glow ring */}
                <View
                  className="w-[60px] h-[60px] rounded-full items-center justify-center"
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
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 34,
                      padding: 3,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 62,
                        height: 62,
                        borderRadius: 31,
                        backgroundColor: theme.card,
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      <Image
                        source={MILO_AVATAR}
                        style={{ width: 62, height: 62, borderRadius: 31 }}
                        contentFit="cover"
                      />
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
                borderRadius: 14,
              }}
            >
              <Ionicons
                name={isActive ? item.activeIcon : item.icon}
                size={24}
                color={isActive ? activeColor : inactiveColor}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

