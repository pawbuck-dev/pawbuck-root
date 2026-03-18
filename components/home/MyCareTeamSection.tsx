import { useTheme } from "@/context/themeContext";
import { CareTeamMemberType, VetInformation } from "@/services/vetInformation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Image, Platform, Text, TouchableOpacity, View } from "react-native";

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
  };
  return type ? colors[type] : "#60A5FA";
};

const PLACEHOLDER_IMAGES: Record<CareTeamMemberType, any> = {
  veterinarian: null,
  dog_walker: null,
  groomer: null,
  pet_sitter: null,
  boarding: null,
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
          borderRadius: 20,
          padding: 16,
          marginBottom: 12,
          ...cardBorderStyle,
        }}
      >
        {/* Type label row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <MaterialCommunityIcons name={typeIcon as any} size={14} color={typeColor} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: typeColor }}>
            {typeLabel}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: theme.foreground, marginBottom: 2 }}>
              {displayName}
            </Text>
            {clinicName && clinicName !== displayName && (
              <Text style={{ fontSize: 13, color: theme.secondary, marginBottom: 10 }}>
                {clinicName}
              </Text>
            )}
            {!clinicName || clinicName === displayName ? (
              <View style={{ height: 10 }} />
            ) : null}

            {/* Action buttons */}
            <View style={{ flexDirection: "row", gap: 8 }}>
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
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 100,
                    backgroundColor: btnBg,
                    gap: 5,
                  }}
                >
                  <Ionicons name="call-outline" size={14} color={theme.secondary} />
                  <Text style={{ fontSize: 12, fontWeight: "500", color: theme.secondary }}>
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
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 100,
                  backgroundColor: isDark ? "rgba(59,208,210,0.12)" : "rgba(59,208,210,0.1)",
                  gap: 5,
                }}
              >
                <Ionicons name="mail-outline" size={14} color={theme.primary} />
                <Text style={{ fontSize: 12, fontWeight: "500", color: theme.primary }}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Placeholder for 3D character image */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 8,
            }}
          >
            <MaterialCommunityIcons name={typeIcon as any} size={32} color={`${typeColor}40`} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Section Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.foreground }}>
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
            backgroundColor: cardBg,
            borderRadius: 20,
            padding: 20,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${theme.primary}20`,
              marginBottom: 10,
            }}
          >
            <Ionicons name="people-outline" size={24} color={theme.primary} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground, marginBottom: 4 }}>
            Add Your Care Team
          </Text>
          <Text style={{ fontSize: 13, color: theme.secondary, textAlign: "center" }}>
            Add your vet, groomer, or walker
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
