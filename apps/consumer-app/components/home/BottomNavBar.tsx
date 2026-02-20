import { useChat } from "@/context/chatContext";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { fetchMessageThreads } from "@/services/messages";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

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
  const { pendingApprovals } = useEmailApproval();

  const { data: threads = [] } = useQuery({
    queryKey: ["messageThreads"],
    queryFn: () => fetchMessageThreads(),
  });

  const unreadCount = useMemo(() => {
    const threadUnread = threads.reduce(
      (sum, t) => sum + (t.unread_count ?? 0),
      0
    );
    return threadUnread + pendingApprovals.length;
  }, [threads, pendingApprovals]);

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

          const showUnreadBadge = item.id === "messages" && unreadCount > 0;
          const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

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
              <View className="relative items-center justify-center">
                <Ionicons
                  name={isActive ? item.activeIcon : item.icon}
                  size={24}
                  color={isActive ? activeColor : inactiveColor}
                />
                {showUnreadBadge && (
                  <View
                    className="absolute -right-2 -top-1 min-w-[18px] items-center justify-center rounded-full px-1"
                    style={{
                      backgroundColor: activeColor,
                      height: 18,
                    }}
                  >
                    <Text
                      className="text-[10px] font-bold text-white"
                      numberOfLines={1}
                    >
                      {badgeLabel}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

