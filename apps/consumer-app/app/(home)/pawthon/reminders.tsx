import { getPawthonSurfaceTokens } from "@/components/pawthon/pawthonSurfaceTokens";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import {
  DEFAULT_PAWTHON_REMINDER_PREFS,
  loadPawthonReminderPrefs,
  savePawthonReminderPrefs,
  schedulePawthonWalkReminders,
  type PawthonWalkReminderPrefs,
} from "@/services/pawthonWalkReminders";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PawthonRemindersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const surfaces = getPawthonSurfaceTokens(isDark, theme);
  const { selectedPet } = useSelectedPet();
  const { pets } = usePets();

  const [prefs, setPrefs] = useState<PawthonWalkReminderPrefs>(DEFAULT_PAWTHON_REMINDER_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [primerOpen, setPrimerOpen] = useState(false);
  const [pendingEnable, setPendingEnable] = useState<Partial<PawthonWalkReminderPrefs> | null>(null);

  useEffect(() => {
    void (async () => {
      setPrefs(await loadPawthonReminderPrefs());
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(
    async (next: PawthonWalkReminderPrefs) => {
      setSaving(true);
      try {
        await savePawthonReminderPrefs(next);
        setPrefs(next);
        const pet = selectedPet ?? pets[0];
        if (pet) {
          await schedulePawthonWalkReminders(pet, next);
        }
      } finally {
        setSaving(false);
      }
    },
    [selectedPet, pets]
  );

  const tryEnable = (patch: Partial<PawthonWalkReminderPrefs>) => {
    const next = { ...prefs, ...patch };
    const turningOn =
      (patch.dailyEnabled && !prefs.dailyEnabled) ||
      (patch.streakProtectionEnabled && !prefs.streakProtectionEnabled) ||
      (patch.weeklyDigestEnabled && !prefs.weeklyDigestEnabled);

    if (turningOn) {
      setPendingEnable(patch);
      setPrimerOpen(true);
      return;
    }
    void persist(next);
  };

  const confirmEnable = async () => {
    setPrimerOpen(false);
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Notifications", "Enable notifications in Settings to use walk reminders.");
      setPendingEnable(null);
      return;
    }
    if (pendingEnable) {
      await persist({ ...prefs, ...pendingEnable });
    }
    setPendingEnable(null);
  };

  const card = (children: React.ReactNode) => (
    <View
      style={{
        backgroundColor: surfaces.cardBackground,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: surfaces.borderColor,
      }}
    >
      {children}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color={theme.primary} />
          </Pressable>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              marginRight: 28,
              fontFamily: "Poppins_600SemiBold",
              fontSize: 17,
              color: theme.foreground,
            }}
          >
            Walk reminders
          </Text>
          {saving ? <ActivityIndicator size="small" color={theme.primary} /> : null}
        </View>

        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView>
            {card(
              <ToggleRow
                title="Daily walk reminder"
                subtitle="6:00 PM · local notification"
                value={prefs.dailyEnabled}
                onValueChange={(v) => tryEnable({ dailyEnabled: v })}
                theme={theme}
              />
            )}
            {card(
              <ToggleRow
                title="Streak protection"
                subtitle="Nudge at 6 PM if no walk today"
                value={prefs.streakProtectionEnabled}
                onValueChange={(v) => tryEnable({ streakProtectionEnabled: v })}
                theme={theme}
              />
            )}
            {card(
              <ToggleRow
                title="Weekly digest"
                subtitle="Mondays at 9 AM"
                value={prefs.weeklyDigestEnabled}
                onValueChange={(v) => tryEnable({ weeklyDigestEnabled: v })}
                theme={theme}
              />
            )}
          </ScrollView>
        )}
      </View>

      <Modal visible={primerOpen} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            paddingHorizontal: 22,
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 20,
              padding: 22,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 18, color: theme.foreground, marginBottom: 10 }}>
              Stay on track with gentle reminders
            </Text>
            <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 14, color: theme.secondary, marginBottom: 18 }}>
              Optional nudges for daily walks and streak protection. Change anytime here.
            </Text>
            <Pressable onPress={() => void confirmEnable()} style={{ marginBottom: 12 }}>
              <View style={{ backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 14, alignItems: "center" }}>
                <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 15, color: theme.primaryForeground }}>
                  Enable notifications
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => {
                setPrimerOpen(false);
                setPendingEnable(null);
              }}
            >
              <Text style={{ textAlign: "center", fontFamily: "Poppins_500Medium", color: theme.secondary }}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  theme,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  theme: { foreground: string; secondary: string; primary: string };
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: theme.foreground }}>{title}</Text>
        <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: theme.secondary, marginTop: 4 }}>
          {subtitle}
        </Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: theme.primary }} />
    </View>
  );
}
