import { useTheme } from "@/context/themeContext";
import { CareTeamMemberType, VetInformation } from "@/services/vetInformation";
import { sanitizeCareTeamMemberDisplayName } from "@/utils/userDisplayIdentity";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Platform, Text, TouchableOpacity, View } from "react-native";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Metro image modules
export const CARE_TEAM_MEMBER_IMAGES: Record<CareTeamMemberType, any> = {
  veterinarian: require("@/assets/images/vet.png"),
  dog_walker: require("@/assets/images/walker.png"),
  groomer: require("@/assets/images/gromer.png"),
  pet_sitter: require("@/assets/images/care.png"),
  boarding: require("@/assets/images/care.png"),
  unknown: require("@/assets/images/care.png"),
};

export const getCareTeamCardTypeIcon = (type: CareTeamMemberType | null): string => {
  const icons: Record<CareTeamMemberType, string> = {
    veterinarian: "stethoscope",
    dog_walker: "paw",
    groomer: "content-cut",
    pet_sitter: "heart",
    boarding: "home",
    unknown: "help-circle-outline",
  };
  return type ? icons[type] : "stethoscope";
};

export const getCareTeamCardTypeLabel = (type: CareTeamMemberType | null): string => {
  const labels: Record<CareTeamMemberType, string> = {
    veterinarian: "Veterinarian",
    dog_walker: "Dog Walker",
    groomer: "Groomer",
    pet_sitter: "Pet Sitter",
    boarding: "Boarding",
    unknown: "Other",
  };
  return type ? labels[type] : "Veterinarian";
};

export type CareTeamMemberContactCardProps = {
  member: VetInformation;
  onPressCard?: () => void;
  readOnly?: boolean;
  /** Rendered in the top-right of the card (e.g. ⋮ menu on Care Team screen dark mode). */
  headerAccessory?: React.ReactNode;
};

/**
 * Care team member tile — same layout as the Dashboard `MyCareTeamSection` populated card.
 */
export function CareTeamMemberContactCard({
  member,
  onPressCard,
  readOnly = false,
  headerAccessory,
}: CareTeamMemberContactCardProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();

  const type = ((member as { type?: CareTeamMemberType }).type ?? "veterinarian") as CareTeamMemberType;
  const typeLabel = getCareTeamCardTypeLabel(type);
  const typeIcon = getCareTeamCardTypeIcon(type);
  const displayName = sanitizeCareTeamMemberDisplayName(member.vet_name, member.clinic_name, typeLabel);
  const clinicName = member.clinic_name;

  const handleCall = async (phone?: string) => {
    if (!phone) return;
    const phoneUrl = `tel:${phone}`;
    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert("Phone", `Phone: ${phone}`, [{ text: "OK", style: "cancel" }]);
      }
    } catch {
      Alert.alert("Phone", `Phone: ${phone}`, [{ text: "OK", style: "cancel" }]);
    }
  };

  const handleEmail = async (email?: string) => {
    if (!email) return;
    router.push({ pathname: "/(home)/messages", params: { email } });
  };

  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF";
  const isAndroid = Platform.OS === "android";
  const cardBorderStyle = isAndroid
    ? {}
    : { borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" };

  return (
    <TouchableOpacity
      onPress={readOnly ? undefined : onPressCard}
      activeOpacity={readOnly ? 1 : 0.7}
      disabled={readOnly}
      style={{
        backgroundColor: cardBg,
        borderRadius: 24,
        paddingLeft: 18,
        paddingTop: 18,
        paddingBottom: 18,
        paddingRight: 0,
        marginBottom: 14,
        overflow: "hidden",
        position: "relative",
        ...cardBorderStyle,
      }}
    >
      {headerAccessory ? (
        <View style={{ position: "absolute", right: 10, top: 14, zIndex: 2 }}>{headerAccessory}</View>
      ) : null}

      {/* Type label row — matches Dashboard */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name={typeIcon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={18}
            color={isDark ? theme.foreground : "#1D2433"}
          />
        </View>
        <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground }}>{typeLabel}</Text>
      </View>

      <View style={{ flexDirection: "row" }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: theme.foreground, marginBottom: 3 }}>
            {displayName}
          </Text>
          {clinicName && clinicName !== displayName ? (
            <Text style={{ fontSize: 14, color: theme.secondary, marginBottom: 14 }}>{clinicName}</Text>
          ) : null}
          {!clinicName || clinicName === displayName ? <View style={{ height: 14 }} /> : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            {member.phone ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleCall(member.phone);
                }}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 100,
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
                  backgroundColor: "transparent",
                  gap: 6,
                }}
              >
                <Ionicons name="call-outline" size={15} color={theme.foreground} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground }}>Call</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleEmail(member.email);
              }}
              activeOpacity={0.7}
              disabled={!member.email}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 100,
                backgroundColor: theme.primary,
                gap: 6,
                opacity: member.email ? 1 : 0.45,
              }}
            >
              <Ionicons name="mail-outline" size={15} color="#FFFFFF" />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Image
          source={CARE_TEAM_MEMBER_IMAGES[type]}
          style={{
            width: 140,
            height: 140,
            marginTop: -10,
            marginRight: -8,
          }}
          contentFit="contain"
        />
      </View>
    </TouchableOpacity>
  );
}
