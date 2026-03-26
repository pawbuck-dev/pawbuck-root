import { useTheme } from "@/context/themeContext";
import type { UserProfile } from "@/services/userProfile";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import {
  getProfileHeroTokens,
  getProfileScreenTokens,
  PROFILE_HERO_AVATAR_RING,
  PROFILE_HERO_AVATAR_SIZE,
  PROFILE_HERO_DETAILS_OVERLAP,
  PROFILE_HERO_DETAILS_PADDING,
  PROFILE_HERO_DETAILS_RADIUS,
  PROFILE_HERO_NAME_LABEL_GAP,
  PROFILE_HERO_OUTER_PADDING,
  PROFILE_HERO_SECTION_GAP,
} from "./profileUiTokens";

type ProfileHeroCardProps = {
  profile: UserProfile;
  displayName: string;
  rawAvatar?: string;
  showAvatarPhoto: boolean;
  onAvatarError: () => void;
  onEditPress: () => void;
};

function FrostLine({
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
      <Text style={{ fontSize: 12, color: muted }}>{label}</Text>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: valueColor,
          marginTop: 4,
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
  rawAvatar,
  showAvatarPhoto,
  onAvatarError,
  onEditPress,
}: ProfileHeroCardProps) {
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  const t = getProfileScreenTokens(theme, isDarkMode);
  const hero = getProfileHeroTokens(theme, isDarkMode);

  const valueColor = t.profileListTitleColor;

  const detailsInner = (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: PROFILE_HERO_SECTION_GAP,
          gap: 12,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, color: t.muted }}>Name</Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: valueColor,
              marginTop: PROFILE_HERO_NAME_LABEL_GAP,
            }}
            numberOfLines={2}
          >
            {displayName}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 100,
            backgroundColor: hero.lockedBadgeBg,
            borderWidth: isDarkMode ? 0 : 1,
            borderColor: isDarkMode ? "transparent" : t.cardBorder,
            marginTop: 2,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "600", color: hero.lockedBadgeText }}>Locked</Text>
        </View>
      </View>
      <FrostLine label="Email" value={profile.email} muted={t.muted} valueColor={valueColor} />
      <FrostLine label="Phone" value={profile.phone || "Not set"} muted={t.muted} valueColor={valueColor} />
      <FrostLine
        label="Address"
        value={profile.address || "Not set"}
        muted={t.muted}
        valueColor={valueColor}
        last
      />
    </>
  );

  const detailsShellStyle = {
    marginTop: -PROFILE_HERO_DETAILS_OVERLAP,
    borderRadius: PROFILE_HERO_DETAILS_RADIUS,
    padding: PROFILE_HERO_DETAILS_PADDING,
    overflow: "hidden" as const,
  };

  return (
    <View
      style={{
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: t.profileCardBg,
        ...t.profileCardBorderStyle,
        marginTop: 4,
        padding: PROFILE_HERO_OUTER_PADDING,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDarkMode ? 0.25 : 0.08,
        shadowRadius: 20,
        elevation: 8,
      }}
    >
      <View style={{ position: "relative" }}>
        {/* Figma 1386:39653 — 40×40 circular edit, top-right, border + light shadow */}
        <TouchableOpacity
          onPress={onEditPress}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            zIndex: 4,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: hero.editFabBg,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: hero.editFabBorder,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 3,
          }}
          accessibilityLabel="Edit profile details"
        >
          <Ionicons name="pencil" size={20} color={hero.editFabIcon} />
        </TouchableOpacity>

        {/* Figma 1386:39635 — 180×180 circular photo */}
        <View style={{ alignItems: "center", paddingTop: 4 }}>
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
            {showAvatarPhoto && rawAvatar ? (
              <ExpoImage
                source={{ uri: rawAvatar }}
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
        </View>

        {/* Figma 1386:39637 — glass panel, overlaps avatar by 32 */}
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={isDarkMode ? 42 : 64}
            tint={isDarkMode ? "dark" : "light"}
            style={[detailsShellStyle, { width: "100%", backgroundColor: hero.detailsGlassFill }]}
          >
            {detailsInner}
          </BlurView>
        ) : (
          <View style={[detailsShellStyle, { width: "100%", backgroundColor: hero.detailsGlassFill }]}>
            {detailsInner}
          </View>
        )}
      </View>
    </View>
  );
}
