import { fetchPrivacyExportStatus, requestPrivacyExport } from "@/services/privacyExport";
import { Alert } from "react-native";

/** Shared Profile + Privacy settings flow for GDPR-style export request. */
export async function requestPrivacyExportWithAlerts(): Promise<void> {
  try {
    const current = await fetchPrivacyExportStatus();
    if (current.status === "queued" || current.status === "running") {
      Alert.alert(
        "Export in progress",
        "We're preparing your data. You'll receive an email with a download link when it's ready."
      );
      return;
    }
    if (current.status === "ready") {
      Alert.alert(
        "Export ready",
        "Check your email for the download link. Links expire 7 days after they're sent."
      );
      return;
    }

    await requestPrivacyExport();
    Alert.alert(
      "Export requested",
      "We're building your data export. You'll receive an email with a secure download link when it's ready (usually within an hour)."
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Could not request export.";
    Alert.alert("Error", message);
  }
}
