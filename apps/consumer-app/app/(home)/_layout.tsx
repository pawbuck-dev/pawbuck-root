import { HomeIndicator } from "@/components/layout/HomeIndicator";
import { MiloChatModal } from "@/components/chat/MiloChatModal";
import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { useMessageThreadsRealtime } from "@/hooks/useMessageThreadsRealtime";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeLayout() {
  const { theme } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Deep links or stale tabs: keep signed-out users out of the home stack.
  useEffect(() => {
    if (loading) return;
    const inHomeGroup = segments[0] === "(home)";
    if (inHomeGroup && !isAuthenticated) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, segments, router]);

  // Refetch message threads when new messages arrive so nav bar unread count updates
  useMessageThreadsRealtime();

  return (
    <>
      <View
        className="flex-1"
        style={{
          backgroundColor: theme.background,
          paddingBottom: bottom,
        }}
      >
        <Slot />
      </View>
      {/* Figma Home Indicator (29:192): pill at bottom of safe area on iOS */}
      {bottom > 0 && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: bottom,
            justifyContent: "flex-end",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <HomeIndicator />
        </View>
      )}
      <MiloChatModal />
    </>
  );
}
