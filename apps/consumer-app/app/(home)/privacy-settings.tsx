import {
  SettingsSubscreenIntro,
  SettingsSubscreenRow,
} from "@/components/layout/SettingsSubscreenRow";
import { SettingsSubscreenLayout } from "@/components/layout/SettingsSubscreenLayout";
import { SettingsSubscreenTile } from "@/components/layout/SettingsSubscreenTile";
import { CONTACT_EMAIL } from "@/constants/contact";
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "@/constants/legal";
import { requestPrivacyExportWithAlerts } from "@/utils/privacyExportUi";
import { useRouter } from "expo-router";
import { Linking, View } from "react-native";

function openExternal(url: string) {
  void Linking.openURL(url).catch(() => {
    // user can retry
  });
}

export default function PrivacySettingsScreen() {
  const router = useRouter();

  return (
    <SettingsSubscreenLayout title="Privacy & Security">
      <SettingsSubscreenIntro>
        PawBuck stores pet health data securely. You control exports, sharing, and account deletion
        from Profile.
      </SettingsSubscreenIntro>

      <SettingsSubscreenTile>
        <SettingsSubscreenRow
          compact
          icon="file-document-outline"
          title="Privacy policy"
          subtitle="pawbuck.com/privacy"
          trailing="external"
          onPress={() => openExternal(PRIVACY_POLICY_URL)}
        />
        <View style={{ height: 16 }} />
        <SettingsSubscreenRow
          compact
          icon="text-box-outline"
          title="Terms of service"
          subtitle="pawbuck.com/terms"
          trailing="external"
          onPress={() => openExternal(TERMS_OF_SERVICE_URL)}
        />
        <View style={{ height: 16 }} />
        <SettingsSubscreenRow
          compact
          ionIcon="download-outline"
          title="Download my data"
          subtitle="Request a copy of your account data by email"
          trailing="forward"
          onPress={() => void requestPrivacyExportWithAlerts()}
        />
        <View style={{ height: 16 }} />
        <SettingsSubscreenRow
          compact
          ionIcon="mail-outline"
          title="Privacy questions"
          subtitle={CONTACT_EMAIL}
          trailing="forward"
          onPress={() => router.push("/(home)/contact")}
        />
      </SettingsSubscreenTile>
    </SettingsSubscreenLayout>
  );
}
