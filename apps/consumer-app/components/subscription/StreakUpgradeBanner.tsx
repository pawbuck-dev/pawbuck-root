import { useSubscription } from "@/context/subscriptionContext";
import { useTheme } from "@/context/themeContext";
import { useAuth } from "@/context/authContext";
import {
  dismissStreakUpgradePrompt,
  readStreakUpgradeDismissedUntil,
  shouldShowStreakUpgradePrompt,
} from "@/services/streakUpgradePrompt";
import { trackSubscriptionEvent } from "@/utils/subscriptionAnalytics";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  streakDays: number;
};

export function StreakUpgradeBanner({ streakDays }: Props) {
  const { user } = useAuth();
  const { plan, openPaywall } = useSubscription();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const [visible, setVisible] = useState(false);
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!user?.id) {
        setVisible(false);
        return;
      }
      const dismissedUntil = await readStreakUpgradeDismissedUntil(user.id);
      if (cancelled) return;
      const show = shouldShowStreakUpgradePrompt(streakDays, plan, dismissedUntil);
      setVisible(show);
      if (show && !tracked) {
        setTracked(true);
        void trackSubscriptionEvent("streak_upgrade_prompt", {
          streak_days: streakDays,
          current_plan: plan,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, streakDays, plan, tracked]);

  const dismiss = useCallback(async () => {
    if (user?.id) {
      await dismissStreakUpgradePrompt(user.id);
    }
    setVisible(false);
    void trackSubscriptionEvent("streak_upgrade_prompt", {
      action: "dismiss",
      streak_days: streakDays,
      current_plan: plan,
    });
  }, [plan, streakDays, user?.id]);

  const upgrade = useCallback(() => {
    void trackSubscriptionEvent("streak_upgrade_prompt", {
      action: "upgrade_tap",
      streak_days: streakDays,
      current_plan: plan,
    });
    openPaywall({
      source: "streak_milestone",
      copyVariant: "streak_milestone",
      requiredPlan: "individual",
    });
  }, [openPaywall, plan, streakDays]);

  if (!visible) return null;

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 16,
        padding: 14,
        backgroundColor: isDark ? "rgba(255, 138, 66, 0.15)" : "rgba(255, 138, 66, 0.12)",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255, 138, 66, 0.35)" : "rgba(255, 138, 66, 0.25)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <Ionicons name="flame" size={24} color="#FF8A42" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: theme.foreground }}>
            {streakDays}-day streak — unlock Milo&apos;s full memory
          </Text>
          <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 4, lineHeight: 18 }}>
            Individual unlocks unlimited Milo and AI journal check-ins.
          </Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            <Pressable
              onPress={upgrade}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 10,
                backgroundColor: theme.primary,
              }}
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Individual"
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.primaryForeground }}>
                Upgrade
              </Text>
            </Pressable>
            <Pressable onPress={() => void dismiss()} hitSlop={8} accessibilityRole="button">
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.secondary, paddingVertical: 8 }}>
                Not now
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
