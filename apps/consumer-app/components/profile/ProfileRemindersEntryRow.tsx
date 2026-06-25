import { ProfileFigmaRow } from "@/components/profile/ProfileFigmaRow";
import { formatRemindersProfileSubtitle } from "@/constants/remindersUi";
import { useUserPreferences } from "@/context/userPreferencesContext";
import { useRouter } from "expo-router";
import React from "react";

/** Collapsed Profile entry → full Reminders settings screen. */
export function ProfileRemindersEntryRow() {
  const router = useRouter();
  const { preferences } = useUserPreferences();
  const subtitle = formatRemindersProfileSubtitle(preferences);

  return (
    <ProfileFigmaRow
      icon="bell-outline"
      title="Reminders"
      subtitle={subtitle}
      onPress={() => router.push("/(home)/reminders")}
    />
  );
}
