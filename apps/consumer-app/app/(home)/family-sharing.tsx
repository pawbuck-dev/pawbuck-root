import { SettingsSubscreenIntro, SettingsSubscreenRow } from "@/components/layout/SettingsSubscreenRow";
import { SettingsSubscreenLayout } from "@/components/layout/SettingsSubscreenLayout";
import { SettingsSubscreenTile } from "@/components/layout/SettingsSubscreenTile";
import { FAMILY_SHARING_TITLE } from "@/constants/approvedPetEmailUi";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";

/** Profile hub — split owner vs invitee paths (Apple-style “choose your situation”). */
export default function FamilySharingHubScreen() {
  const router = useRouter();

  return (
    <SettingsSubscreenLayout title={FAMILY_SHARING_TITLE}>
      <SettingsSubscreenIntro>
        Choose whether you were invited to a household or you manage sharing for your pets.
      </SettingsSubscreenIntro>

      <SettingsSubscreenTile>
        <SettingsSubscreenRow
          compact
          icon="home-account"
          title="I was invited"
          subtitle="Enter a household code from a family member"
          trailing="forward"
          onPress={() => router.push("/join-household")}
        />
        <View style={{ height: 12 }} />
        <SettingsSubscreenRow
          compact
          icon="account-cog-outline"
          title="I manage access"
          subtitle="Invite family, care team & trusted contacts"
          trailing="forward"
          onPress={() => router.push("/(home)/family-access")}
        />
      </SettingsSubscreenTile>
    </SettingsSubscreenLayout>
  );
}
