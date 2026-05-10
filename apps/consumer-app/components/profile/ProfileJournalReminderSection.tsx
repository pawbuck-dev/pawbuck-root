import { ProfileSectionHeading } from "@/components/profile/ProfileFigmaRow";
import { ProfileListCard } from "@/components/profile/ProfileListCard";
import { useNotifications } from "@/context/notificationsContext";
import { useTheme } from "@/context/themeContext";
import { useUserPreferences } from "@/context/userPreferencesContext";
import type { TablesUpdate } from "@/database.types";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Switch, Text, View } from "react-native";

const EVENING_HOURS = [
  { hour: 17, label: "5 PM" },
  { hour: 18, label: "6 PM" },
  { hour: 19, label: "7 PM" },
  { hour: 20, label: "8 PM" },
  { hour: 21, label: "9 PM" },
  { hour: 22, label: "10 PM" },
];

/**
 * Local daily journal nudge + toggles for server push document / vet reminders (5.4).
 */
export default function ProfileJournalReminderSection() {
  const { theme } = useTheme();
  const { preferences, updatePreferences, updatingPreferences } = useUserPreferences();
  const { refreshNotifications } = useNotifications();
  const queryClient = useQueryClient();
  const userId = preferences?.user_id;
  const [localBusy, setLocalBusy] = useState(false);

  const persist = useCallback(
    async (patch: Partial<TablesUpdate<"user_preferences">>) => {
      setLocalBusy(true);
      try {
        await updatePreferences(patch);
        if (userId) {
          await queryClient.invalidateQueries({ queryKey: ["userPreferences", userId] });
        }
        await refreshNotifications();
      } finally {
        setLocalBusy(false);
      }
    },
    [updatePreferences, queryClient, userId, refreshNotifications]
  );

  const busy = updatingPreferences || localBusy;
  const journalEnabled = preferences?.journal_prompt_enabled ?? true;
  const journalHour = preferences?.journal_prompt_hour ?? 20;
  const docPush = preferences?.document_expiry_push_enabled ?? true;
  const vetPush = preferences?.vet_appointment_reminder_push_enabled ?? true;

  return (
    <>
      <ProfileSectionHeading>Reminders</ProfileSectionHeading>
      <ProfileListCard>
        <View style={{ paddingVertical: 12, paddingHorizontal: 4, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: theme.foreground }}>
                Daily journal prompt
              </Text>
              <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 4 }}>
                Local notification on this device (default 8 PM).
              </Text>
            </View>
            {busy ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Switch
                value={journalEnabled}
                onValueChange={(v) => {
                  void persist({ journal_prompt_enabled: v });
                }}
              />
            )}
          </View>

          {journalEnabled ? (
            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.secondary, marginBottom: 8 }}>
                Time
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {EVENING_HOURS.map(({ hour, label }) => {
                  const selected = journalHour === hour;
                  return (
                    <Pressable
                      key={hour}
                      disabled={busy}
                      onPress={() => {
                        void persist({ journal_prompt_hour: hour, journal_prompt_minute: 0 });
                      }}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        backgroundColor: selected ? theme.primary : theme.card,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: selected ? "#fff" : theme.foreground,
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={{ height: 1, backgroundColor: theme.border }} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: theme.foreground }}>
                Insurance & travel expiry alerts
              </Text>
              <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 4 }}>
                Push when a saved policy or certificate is nearing expiry (30, 7, 1 days, or day-of).
              </Text>
            </View>
            <Switch
              value={docPush}
              disabled={busy}
              onValueChange={(v) => {
                void persist({ document_expiry_push_enabled: v });
              }}
            />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: theme.foreground }}>
                Vet appointment alerts
              </Text>
              <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 4 }}>
                Push about 24 hours and about 1 hour before a confirmed visit.
              </Text>
            </View>
            <Switch
              value={vetPush}
              disabled={busy}
              onValueChange={(v) => {
                void persist({ vet_appointment_reminder_push_enabled: v });
              }}
            />
          </View>
        </View>
      </ProfileListCard>
    </>
  );
}
