import { useOnboarding } from "@/context/onboardingContext";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { navigateToAddPetFlow } from "@/utils/navigateToAddPetFlow";
import { resolveHomeCareHeadline } from "@/utils/userDisplayIdentity";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import PrivateImage from "@/components/common/PrivateImage";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type HomeHeaderProps = {
  notificationCount?: number;
};

export default function HomeHeader({ notificationCount = 0 }: HomeHeaderProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { user } = useAuth();
  const { pets } = usePets();
  const { resetOnboarding } = useOnboarding();
  const { selectedPet } = useSelectedPet();
  const router = useRouter();
  const greeting = useMemo(() => getGreeting(), []);
  const headline = useMemo(
    () => resolveHomeCareHeadline(user, selectedPet),
    [user, selectedPet]
  );

  const btnStyle = {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {/* Left: Pet avatar + greeting */}
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              overflow: "hidden",
              backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            {selectedPet?.photo_url ? (
              <PrivateImage
                bucketName="pets"
                filePath={selectedPet.photo_url}
                style={{ width: 52, height: 52 }}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="paw" size={24} color={isDark ? "#FFFFFF" : theme.secondary} />
            )}
          </View>
          <View>
            <Text style={{ fontSize: 14, color: isDark ? "rgba(255,255,255,0.6)" : "#5A5F6A", marginBottom: 2 }}>
              {greeting}
            </Text>
            <Text style={{ fontSize: 22, fontWeight: "700", color: theme.foreground }}>
              {headline}
            </Text>
          </View>
        </View>

        {/* Right: Action buttons */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              navigateToAddPetFlow({
                router,
                hasExistingPets: pets.length > 0,
                resetOnboarding,
              });
            }}
            activeOpacity={0.7}
            style={btnStyle}
          >
            <Ionicons name="add" size={22} color={theme.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              router.push("/(home)/calendar" as any);
            }}
            activeOpacity={0.7}
            style={btnStyle}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={btnStyle}
          >
            <Ionicons name="notifications-outline" size={20} color={theme.foreground} />
            {notificationCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#EF4444",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 4,
                  borderWidth: 2,
                  borderColor: isDark ? "#1A2A2A" : theme.background,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFFFFF" }}>
                  {notificationCount > 99 ? "99" : notificationCount.toString().padStart(2, "0")}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
