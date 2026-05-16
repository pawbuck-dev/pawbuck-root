import { useTheme } from "@/context/themeContext";
import { CareTeamMemberType, VetInformation } from "@/services/vetInformation";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { CareTeamEmptyStateCard } from "./CareTeamEmptyStateCard";
import { CareTeamMemberContactCard } from "./CareTeamMemberContactCard";

type MyCareTeamSectionProps = {
  careTeamMembers?: VetInformation[];
  onAddMember: (type: CareTeamMemberType) => void;
  onEditMember?: (member: VetInformation) => void;
  readOnly?: boolean;
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

  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* Section Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "500",
            color: isDark ? "#FFFFFF" : "#0D0F0F",
            lineHeight: 21.6,
            textTransform: "capitalize",
          }}
        >
          My Care Team
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(home)/family-access" as any)}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: theme.primary }}>Manage</Text>
          <Ionicons name="open-outline" size={14} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Care Team Cards — shared with Care Team screen */}
      {careTeamMembers.length > 0 ? (
        careTeamMembers.map((member) => (
          <CareTeamMemberContactCard
            key={member.id}
            member={member}
            onPressCard={readOnly ? undefined : () => onEditMember?.(member)}
            readOnly={readOnly}
          />
        ))
      ) : (
        <CareTeamEmptyStateCard
          contactCount={careTeamMembers.length}
          onAddTeamPress={() => {
            if (readOnly) {
              router.push("/(home)/family-access" as any);
            } else {
              onAddMember("veterinarian");
            }
          }}
        />
      )}
    </View>
  );
}
