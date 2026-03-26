import { useChat } from "@/context/chatContext";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { fetchMessageThreads } from "@/services/messages";
import { useQuery } from "@tanstack/react-query";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { usePathname, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MILO_AVATAR = require("@/assets/images/milo_gif.gif");

type NavItem = {
  id: string;
  iconFamily: "ionicons" | "material";
  icon: string;
  activeIcon: string;
  route?: string;
};

type BottomNavBarProps = {
  activeTab?: string;
  selectedPetId?: string | null;
};

const CIRCLE = 48;
const MILO = 60;
const BAR_V_PAD = 8;
const BAR_H_PAD = 8;
const BAR_HEIGHT = CIRCLE + BAR_V_PAD * 2;

export default function BottomNavBar({
  activeTab = "home",
  selectedPetId,
}: BottomNavBarProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const pathname = usePathname();
  const { openChat } = useChat();
  const { pets } = usePets();
  const { pendingApprovals } = useEmailApproval();
  const insets = useSafeAreaInsets();

  const { data: threads = [] } = useQuery({
    queryKey: ["messageThreads"],
    queryFn: () => fetchMessageThreads(),
  });

  const unreadCount = useMemo(() => {
    const threadUnread = threads.reduce((sum, t) => sum + (t.unread_count ?? 0), 0);
    return threadUnread + pendingApprovals.length;
  }, [threads, pendingApprovals]);

  const petIdForNavigation = selectedPetId ?? pets[0]?.id;

  const navItems: NavItem[] = [
    { id: "home", iconFamily: "ionicons", icon: "home-outline", activeIcon: "home", route: "/(home)/home" },
    { id: "records", iconFamily: "material", icon: "heart-pulse", activeIcon: "heart-pulse", route: "/(home)/health-record/[id]" },
    { id: "messages", iconFamily: "ionicons", icon: "chatbubbles-outline", activeIcon: "chatbubbles", route: "/(home)/messages" },
    { id: "profile", iconFamily: "ionicons", icon: "person-outline", activeIcon: "person", route: "/(home)/profile" },
  ];

  const handleNavPress = (id: string) => {
    if (id === "milo") {
      openChat();
      return;
    }
    const item = navItems.find((n) => n.id === id);
    if (!item?.route) return;
    if (item.id === "records") {
      if (petIdForNavigation) router.push(`/(home)/health-record/${petIdForNavigation}` as any);
      return;
    }
    router.push(item.route as any);
  };

  const ACTIVE = "#3BD0D2";
  const ICON_INACTIVE = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.65)";
  const BAR_BG = isDark ? "#1E2B2B" : "#D8DEDE";
  const RING = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const RING_INNER = isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.45)";
  const MILO_RING = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  const renderIcon = (item: NavItem, isActive: boolean) => {
    const color = isActive ? "#FFFFFF" : ICON_INACTIVE;
    const size = 22;
    if (item.iconFamily === "material") {
      return <MaterialCommunityIcons name={item.icon as any} size={size} color={color} />;
    }
    return (
      <Ionicons
        name={(isActive ? item.activeIcon : item.icon) as any}
        size={size}
        color={color}
      />
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: Math.max(insets.bottom > 0 ? 2 : 6, Platform.OS === "android" ? 6 : 0),
        gap: 6,
      }}
    >
      {/* Main pill bar with 4 nav icons */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: BAR_BG,
          borderRadius: BAR_HEIGHT / 2,
          height: BAR_HEIGHT,
          paddingHorizontal: BAR_H_PAD,
          gap: 6,
        }}
      >
        {navItems.map((item) => {
          const isActive = item.id === activeTab || (item.route && pathname === item.route);
          const showBadge = item.id === "messages" && unreadCount > 0;
          const badgeText = unreadCount > 99 ? "99+" : String(unreadCount).padStart(2, "0");

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleNavPress(item.id)}
              activeOpacity={0.7}
              style={{
                width: CIRCLE,
                height: CIRCLE,
                borderRadius: CIRCLE / 2,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isActive ? ACTIVE : RING_INNER,
                borderWidth: isActive ? 0 : 1.5,
                borderColor: isActive ? "transparent" : RING,
              }}
            >
              <View style={{ position: "relative" }}>
                {renderIcon(item, !!isActive)}
                {showBadge && (
                  <View
                    style={{
                      position: "absolute",
                      top: -9,
                      right: -12,
                      minWidth: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: "#EF4444",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 4,
                      borderWidth: 2.5,
                      borderColor: BAR_BG,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#fff" }}>
                      {badgeText}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Milo avatar - separate circle outside the bar */}
      <TouchableOpacity
        onPress={() => handleNavPress("milo")}
        activeOpacity={0.8}
        style={{
          width: MILO,
          height: MILO,
          borderRadius: MILO / 2,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 3,
          borderColor: MILO_RING,
          backgroundColor: isDark ? "#1E2B2B" : "#D6DADA",
        }}
      >
        <Image
          source={MILO_AVATAR}
          style={{
            width: MILO - 6,
            height: MILO - 6,
            borderRadius: (MILO - 6) / 2,
          }}
          contentFit="cover"
        />
      </TouchableOpacity>
    </View>
  );
}
