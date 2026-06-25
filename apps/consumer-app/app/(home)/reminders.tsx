import { SettingsSubscreenLayout } from "@/components/layout/SettingsSubscreenLayout";
import { RemindersSettingsContent } from "@/components/settings/RemindersSettingsContent";
import React from "react";

export default function RemindersScreen() {
  return (
    <SettingsSubscreenLayout title="Reminders">
      <RemindersSettingsContent />
    </SettingsSubscreenLayout>
  );
}
