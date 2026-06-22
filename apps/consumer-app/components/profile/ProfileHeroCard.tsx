import PrivateImage from "@/components/common/PrivateImage";
import { getSettingsSubscreenTokens } from "@/components/layout/settingsSubscreenTokens";
import { useTheme } from "@/context/themeContext";
import type { UserProfile } from "@/services/userProfile";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import {
  getProfileHeroTokens,
  getProfileScreenTokens,
  PROFILE_HERO_AVATAR_DETAILS_GAP,
  PROFILE_HERO_AVATAR_RING,
  PROFILE_HERO_AVATAR_SIZE,
  PROFILE_HERO_DETAILS_PADDING,
  PROFILE_HERO_NAME_LABEL_GAP,
  PROFILE_HERO_OUTER_PADDING,
  PROFILE_HERO_SECTION_GAP,
} from "./profileUiTokens";

type ProfileHeroCardProps = {
  profile: UserProfile;
  displayName: string;
  hideNameLockedBadge?: boolean;
  emailDisplayPrimary: string;
  emailRelayRaw?: string | null;
  profilePhotoPath?: string | null;
  oauthAvatarUrl?: string;
  showOAuthAvatar: boolean;
  onAvatarError: () => void;
  onEditPress: () => void;
};

function DetailLine({
  label,
  value,
  muted,
  valueColor,
  last,
}: {
  label: string;
  value: string;
  muted: string;
  valueColor: string;
  last?: boolean;
}) {
  return (
    <View style={{ marginBottom: last ? 0 : PROFILE_HERO_SECTION_GAP }}>
      <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: muted }}>{label}</Text>
      <Text
        style={{
          fontSize: 16,
          fontFamily: "Poppins_600SemiBold",
          color: valueColor,
          marginTop: PROFILE_HERO_NAME_LABEL_GAP,
        }}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
}

export function ProfileHeroCard({
  profile,
  displayName,
  emailDisplayPrimary,
  emailRelayRaw,
  profilePhotoPath,
  oauthAvatarUrl,
  showOAuthAvatar,
  onAvatarError,
  onEditPress,
}: ProfileHeroCardProps) {
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  const t = getProfileScreenTokens(theme, isDarkMode);
  const subscreen = getSettingsSubscreenTokens(theme, isDarkMode);
  const hero = getProfileHeroTokens(theme, isDarkMode);
  const [emailDetailsOpen, setEmailDetailsOpen] = useState(false);

  const valueColor = t.profileListTitleColor;

  return (
    <View
      style={{
        borderRadius: subscreen.tileRadius,
        overflow: "hidden",
        backgroundColor: subscreen.tileBg,
        marginTop: 4,
        padding: PROFILE_HERO_OUTER_PADDING,
        ...subscreen.tileBorder,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: isDarkMode ? 4 : 2 },
        shadowOpacity: isDarkMode ? 0.2 : 0.06,
        shadowRadius: isDarkMode ? 12 : 10,
        elevation: 4,
      }}
    >
      {/* Avatar — centered, edit FAB on bottom-trailing (Contacts / Photos pattern) */}
      <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: PROFILE_HERO_AVATAR_DETAILS_GAP }}>
        <View
          style={{
            width: PROFILE_HERO_AVATAR_SIZE,
            height: PROFILE_HERO_AVATAR_SIZE,
            position: "relative",
          }}
        >
          <View
            style={{
              width: PROFILE_HERO_AVATAR_SIZE,
              height: PROFILE_HERO_AVATAR_SIZE,
              borderRadius: PROFILE_HERO_AVATAR_SIZE / 2,
              overflow: "hidden",
              borderWidth: PROFILE_HERO_AVATAR_RING,
              borderColor: hero.avatarRingColor,
              backgroundColor: isDarkMode ? "#1A2228" : "#E8F0F0",
            }}
          >
            {profilePhotoPath ? (
              <PrivateImage
                bucketName="pets"
                filePath={profilePhotoPath}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : showOAuthAvatar && oauthAvatarUrl ? (
              <ExpoImage
                source={{ uri: oauthAvatarUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
                onError={onAvatarError}
              />
            ) : (
              <LinearGradient
                colors={[...hero.placeholderGradient]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={{
                  width: "100%",
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    backgroundColor: "rgba(255,255,255,0.22)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: "rgba(255,255,255,0.5)",
                  }}
                >
                  <Ionicons name="person" size={42} color="#FFFFFF" />
                </View>
              </LinearGradient>
            )}
          </View>

          <TouchableOpacity
            onPress={onEditPress}
            style={{
              position: "absolute",
              bottom: 4,
              right: 4,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: hero.editFabBg,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: hero.editFabBorder,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 4,
              elevation: 3,
            }}
            accessibilityLabel="Edit profile"
            accessibilityRole="button"
          >
            <Ionicons name="pencil" size={18} color={hero.editFabIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Details — solid grouped block below avatar (no overlap, no blur) */}
      <View
        style={{
          paddingHorizontal: PROFILE_HERO_DETAILS_PADDING - PROFILE_HERO_OUTER_PADDING,
          paddingBottom: PROFILE_HERO_DETAILS_PADDING,
        }}
      >
        <DetailLine label="Name" value={displayName} muted={t.muted} valueColor={valueColor} />
        <View style={{ marginBottom: PROFILE_HERO_SECTION_GAP }}>
          <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: t.muted }}>Email</Text>
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Poppins_600SemiBold",
              color: valueColor,
              marginTop: PROFILE_HERO_NAME_LABEL_GAP,
            }}
            numberOfLines={3}
          >
            {emailDisplayPrimary}
          </Text>
          {emailRelayRaw ? (
            <>
              <TouchableOpacity onPress={() => setEmailDetailsOpen((o) => !o)} style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 14, fontFamily: "Poppins_600SemiBold", color: theme.primary }}>
                  {emailDetailsOpen ? "Hide details" : "Show details"}
                </Text>
              </TouchableOpacity>
              {emailDetailsOpen ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: t.muted,
                    marginTop: 6,
                    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                  }}
                  selectable
                >
                  {emailRelayRaw}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>
        <DetailLine
          label="Phone"
          value={profile.phone || "Not set"}
          muted={t.muted}
          valueColor={valueColor}
        />
        <DetailLine
          label="Address"
          value={profile.address || "Not set"}
          muted={t.muted}
          valueColor={valueColor}
          last
        />
      </View>
    </View>
  );
}
