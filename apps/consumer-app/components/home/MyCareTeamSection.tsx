import { useTheme } from "@/context/themeContext";
import { CareTeamMemberType, VetInformation } from "@/services/vetInformation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Platform, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";

type MyCareTeamSectionProps = {
  careTeamMembers?: VetInformation[];
  onAddMember: (type: CareTeamMemberType) => void;
  onEditMember?: (member: VetInformation) => void;
  readOnly?: boolean;
};

const getTypeIcon = (type: CareTeamMemberType | null): string => {
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

const getTypeLabel = (type: CareTeamMemberType | null): string => {
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

const getTypeColor = (type: CareTeamMemberType | null): string => {
  const colors: Record<CareTeamMemberType, string> = {
    veterinarian: "#60A5FA",
    dog_walker: "#4ADE80",
    groomer: "#A78BFA",
    pet_sitter: "#F472B6",
    boarding: "#D97706",
    unknown: "#94A3B8",
  };
  return type ? colors[type] : "#60A5FA";
};

const CARE_TEAM_IMAGES: Record<CareTeamMemberType, any> = {
  veterinarian: require("@/assets/images/vet.png"),
  dog_walker: require("@/assets/images/walker.png"),
  groomer: require("@/assets/images/gromer.png"),
  pet_sitter: require("@/assets/images/care.png"),
  boarding: require("@/assets/images/care.png"),
  unknown: require("@/assets/images/care.png"),
};

export default function MyCareTeamSection({
  careTeamMembers = [],
  onAddMember,
  onEditMember,
  readOnly = false,
}: MyCareTeamSectionProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();

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
  const btnBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";

  const renderContactCard = (member: VetInformation) => {
    const type = ((member as any).type as CareTeamMemberType) || "veterinarian";
    const typeLabel = getTypeLabel(type);
    const typeColor = getTypeColor(type);
    const typeIcon = getTypeIcon(type);
    const displayName = member.vet_name || member.clinic_name;
    const clinicName = member.clinic_name;

    return (
      <TouchableOpacity
        key={member.id}
        onPress={readOnly ? undefined : () => onEditMember?.(member)}
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
          ...cardBorderStyle,
        }}
      >
        {/* Type label row */}
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
            <MaterialCommunityIcons name={typeIcon as any} size={18} color={isDark ? theme.foreground : "#1D2433"} />
          </View>
          <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground }}>
            {typeLabel}
          </Text>
        </View>

        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: theme.foreground, marginBottom: 3 }}>
              {displayName}
            </Text>
            {clinicName && clinicName !== displayName && (
              <Text style={{ fontSize: 14, color: theme.secondary, marginBottom: 14 }}>
                {clinicName}
              </Text>
            )}
            {!clinicName || clinicName === displayName ? (
              <View style={{ height: 14 }} />
            ) : null}

            <View style={{ flexDirection: "row", gap: 10 }}>
              {member.phone && (
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
                  <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground }}>
                    Call
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleEmail(member.email);
                }}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 100,
                  backgroundColor: theme.primary,
                  gap: 6,
                }}
              >
                <Ionicons name="mail-outline" size={15} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Image
            source={CARE_TEAM_IMAGES[type]}
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
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Section Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <Text style={{ fontSize: 18, fontWeight: "500", color: isDark ? "#FFFFFF" : "#0D0F0F", lineHeight: 21.6, textTransform: "capitalize" }}>
          My Care Team
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (readOnly) {
              router.push("/(home)/settings" as any);
            } else {
              router.push("/(home)/family-access" as any);
            }
          }}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: theme.primary }}>
            Manage
          </Text>
          <Ionicons name="open-outline" size={14} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Care Team Cards */}
      {careTeamMembers.length > 0 ? (
        careTeamMembers.map((member) => renderContactCard(member))
      ) : (
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 24,
            overflow: "hidden",
            ...cardBorderStyle,
          }}
        >
          <View style={{ flexDirection: "row", minHeight: 200 }}>
            {/* Left content */}
            <View style={{ flex: 1, padding: 20, justifyContent: "space-between", zIndex: 2 }}>
              {/* Header */}
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EDEDEE",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialCommunityIcons name="account-group-outline" size={22} color={isDark ? "#FFFFFF" : "#1D2433"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>
                      My Care Team
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.secondary }}>
                      0 contacts can communicate
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? "rgba(255,255,255,0.6)" : "#5A5F6A",
                    lineHeight: 20,
                    marginTop: 16,
                    marginBottom: 20,
                  }}
                >
                  There are no care{"\n"}team members linked{"\n"}to this pet.
                </Text>
              </View>

              {/* Add Team button */}
              <TouchableOpacity
                onPress={() => {
                  if (readOnly) {
                    router.push("/(home)/settings" as any);
                  } else {
                    onAddMember("veterinarian");
                  }
                }}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 100,
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
                  backgroundColor: "transparent",
                  gap: 8,
                }}
              >
                <Ionicons name="add" size={18} color={theme.foreground} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground }}>
                  Add Team
                </Text>
              </TouchableOpacity>
            </View>

            {/* Right illustration */}
            <View
              style={{
                width: 150,
                justifyContent: "flex-end",
                alignItems: "flex-end",
                zIndex: 1,
              }}
            >
              <Image
                source={require("@/assets/images/care.png")}
                style={{
                  width: 165,
                  height: 165,
                  marginBottom: -4,
                  marginRight: -8,
                }}
                contentFit="contain"
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
