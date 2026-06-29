import { SettingsSubscreenIntro } from "@/components/layout/SettingsSubscreenRow";
import { SettingsSubscreenTile } from "@/components/layout/SettingsSubscreenTile";
import { getSettingsSubscreenTokens } from "@/components/layout/settingsSubscreenTokens";
import { EVENING_JOURNAL_HOURS } from "@/constants/remindersUi";
import { useNotifications } from "@/context/notificationsContext";
import { useSubscription } from "@/context/subscriptionContext";
import { useTheme } from "@/context/themeContext";
import { useUserPreferences } from "@/context/userPreferencesContext";
import type { TablesUpdate } from "@/database.types";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Switch, Text, View } from "react-native";

function ReminderToggleRow({
  title,
  subtitle,
  value,
  disabled,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (next: boolean) => void;
}) {
  const { theme, mode } = useTheme();
  const t = getSettingsSubscreenTokens(theme, mode === "dark");

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            fontSize: 16,
            color: theme.foreground,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: "Poppins_400Regular",
            fontSize: 13,
            lineHeight: 18,
            color: t.muted,
            marginTop: 4,
          }}
        >
          {subtitle}
        </Text>
      </View>
      <Switch value={value} disabled={disabled} onValueChange={onValueChange} />
    </View>
  );
}

function TileDivider() {
  const { theme, mode } = useTheme();
  const t = getSettingsSubscreenTokens(theme, mode === "dark");

  return <View style={{ height: 1, backgroundColor: t.borderSubtle, marginVertical: 16 }} />;
}

/**
 * Journal nudge + push toggles for document / vet reminders (Profile → Reminders).
 */
export function RemindersSettingsContent() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const t = getSettingsSubscreenTokens(theme, isDark);
  const { preferences, updatePreferences, updatingPreferences } = useUserPreferences();
  const { refreshNotifications } = useNotifications();
  const { canAccessFeature, openPaywall } = useSubscription();
  const queryClient = useQueryClient();
  const userId = preferences?.user_id;
  const [localBusy, setLocalBusy] = useState(false);

  const healthAlertsEnabled = canAccessFeature("health_alerts");

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
  const vaccineCarePush = (preferences as { proactive_vaccine_push_enabled?: boolean } | null)
    ?.proactive_vaccine_push_enabled ?? true;

  return (
    <>
      <SettingsSubscreenIntro>
        Choose when PawBuck nudges you on this device and which push alerts you receive.
      </SettingsSubscreenIntro>

      <SettingsSubscreenTile heading="On this device">
        <ReminderToggleRow
          title="Daily journal prompt"
          subtitle="Local reminder to log how your pet is doing."
          value={journalEnabled}
          disabled={busy}
          onValueChange={(v) => {
            void persist({ journal_prompt_enabled: v });
          }}
        />

        {journalEnabled ? (
          <View style={{ marginTop: 16 }}>
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 13,
                color: t.muted,
                marginBottom: 10,
              }}
            >
              Evening time
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {EVENING_JOURNAL_HOURS.map(({ hour, label }) => {
                const selected = journalHour === hour;
                return (
                  <Pressable
                    key={hour}
                    disabled={busy}
                    onPress={() => {
                      void persist({ journal_prompt_hour: hour, journal_prompt_minute: 0 });
                    }}
                    style={({ pressed }) => ({
                      width: "31%",
                      minWidth: 96,
                      paddingVertical: 10,
                      borderRadius: t.rowRadius,
                      alignItems: "center",
                      backgroundColor: selected ? theme.primary : t.nestedBg,
                      borderWidth: 1,
                      borderColor: selected ? theme.primary : t.borderSubtle,
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        fontSize: 14,
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

        {busy ? (
          <View style={{ marginTop: 12, alignItems: "flex-start" }}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : null}
      </SettingsSubscreenTile>

      <SettingsSubscreenTile heading="Push alerts">
        {!healthAlertsEnabled ? (
          <Pressable
            onPress={() => openPaywall({ source: "health_alerts", requiredPlan: "individual" })}
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(59,208,210,0.12)" : "#E6F7F6",
              borderWidth: 1,
              borderColor: isDark ? "rgba(59,208,210,0.35)" : "#9DD9D5",
            }}
          >
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 15, color: theme.foreground }}>
              Health alerts require Individual
            </Text>
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                fontSize: 13,
                lineHeight: 18,
                color: t.muted,
                marginTop: 4,
              }}
            >
              Upgrade for insurance expiry and vet appointment reminders. Your journal nudge on this device stays
              free.
            </Text>
          </Pressable>
        ) : null}

        <ReminderToggleRow
          title="Insurance & travel expiry"
          subtitle="When a saved policy or certificate is nearing expiry (30, 7, 1 days, or day-of)."
          value={healthAlertsEnabled ? docPush : false}
          disabled={busy || !healthAlertsEnabled}
          onValueChange={(v) => {
            if (!healthAlertsEnabled) {
              openPaywall({ source: "health_alerts", requiredPlan: "individual" });
              return;
            }
            void persist({ document_expiry_push_enabled: v });
          }}
        />

        <TileDivider />

        <ReminderToggleRow
          title="Vet appointment reminders"
          subtitle="About 24 hours and about 1 hour before a confirmed visit."
          value={healthAlertsEnabled ? vetPush : false}
          disabled={busy || !healthAlertsEnabled}
          onValueChange={(v) => {
            if (!healthAlertsEnabled) {
              openPaywall({ source: "health_alerts", requiredPlan: "individual" });
              return;
            }
            void persist({ vet_appointment_reminder_push_enabled: v });
          }}
        />

        <TileDivider />

        <ReminderToggleRow
          title="Vaccine care reminders"
          subtitle="Daily digest push when vaccines are overdue or a core vaccine is missing from your records."
          value={vaccineCarePush}
          disabled={busy}
          onValueChange={(v) => {
            void persist({ proactive_vaccine_push_enabled: v } as Partial<TablesUpdate<"user_preferences">>);
          }}
        />
      </SettingsSubscreenTile>
    </>
  );
}
