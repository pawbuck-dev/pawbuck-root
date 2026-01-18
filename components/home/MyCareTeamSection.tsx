import { useTheme } from "@/context/themeContext";
import { CareTeamMemberType, VetInformation } from "@/services/vetInformation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

type MyCareTeamSectionProps = {
  careTeamMembers?: VetInformation[];
  onAddMember: (type: CareTeamMemberType) => void;
  onEditMember?: (member: VetInformation) => void;
  readOnly?: boolean; // If true, hide add/edit buttons and make cards non-editable
  // Care team members are automatically whitelisted via pet_care_team_members junction table
};

const getTypeIcon = (
  type: CareTeamMemberType | null
):
  | keyof typeof Ionicons.glyphMap
  | keyof typeof MaterialCommunityIcons.glyphMap => {
  if (!type) return "stethoscope";

  const icons: Record<
    CareTeamMemberType,
    | keyof typeof Ionicons.glyphMap
    | keyof typeof MaterialCommunityIcons.glyphMap
  > = {
    veterinarian: "stethoscope", // MaterialCommunityIcons
    dog_walker: "paw", // MaterialCommunityIcons (closest to footprints)
    groomer: "content-cut", // MaterialCommunityIcons (scissors)
    pet_sitter: "heart", // MaterialCommunityIcons
    boarding: "home", // MaterialCommunityIcons
  };
  return icons[type];
};

const getTypeLabel = (type: CareTeamMemberType | null): string => {
  if (!type) return "Veterinarian";

  const labels: Record<CareTeamMemberType, string> = {
    veterinarian: "Veterinarian",
    dog_walker: "Dog Walker",
    groomer: "Groomer",
    pet_sitter: "Pet Sitter",
    boarding: "Boarding",
  };
  return labels[type];
};

const getIconType = (
  type: CareTeamMemberType | null
): "ionicons" | "material" => {
  if (!type) return "material";

  // All care team member icons use MaterialCommunityIcons
  return "material";
};

// Get color for care team member type - matches messages screen colors
const getTypeColor = (type: CareTeamMemberType | null): string => {
  if (!type) return "#60A5FA"; // Default to veterinarian blue

  const colors: Record<CareTeamMemberType, string> = {
    veterinarian: "#60A5FA", // Blue
    dog_walker: "#4ADE80", // Green
    groomer: "#A78BFA", // Purple
    pet_sitter: "#F472B6", // Pink
    boarding: "#D97706", // Orange
  };
  return colors[type];
};

// Get background color with opacity for care team member type
const getTypeBackgroundColor = (
  type: CareTeamMemberType | null,
  isDarkMode: boolean
): string => {
  if (!type) {
    return isDarkMode ? "rgba(96, 165, 250, 0.2)" : "rgba(96, 165, 250, 0.15)"; // Default to veterinarian
  }

  if (isDarkMode) {
    // For dark mode, use rgba with 0.2 opacity
    const darkColors: Record<CareTeamMemberType, string> = {
      veterinarian: "rgba(96, 165, 250, 0.2)", // Blue
      dog_walker: "rgba(74, 222, 128, 0.2)", // Green
      groomer: "rgba(167, 139, 250, 0.2)", // Purple
      pet_sitter: "rgba(244, 114, 182, 0.2)", // Pink
      boarding: "rgba(217, 119, 6, 0.2)", // Orange
    };
    return darkColors[type];
  } else {
    // For light mode, use lighter tint with 0.15 opacity
    const lightColors: Record<CareTeamMemberType, string> = {
      veterinarian: "rgba(96, 165, 250, 0.15)", // Blue
      dog_walker: "rgba(74, 222, 128, 0.15)", // Green
      groomer: "rgba(167, 139, 250, 0.15)", // Purple
      pet_sitter: "rgba(244, 114, 182, 0.15)", // Pink
      boarding: "rgba(217, 119, 6, 0.15)", // Orange
    };
    return lightColors[type];
  }
};

export default function MyCareTeamSection({
  careTeamMembers = [],
  onAddMember,
  onEditMember,
  readOnly = false,
}: MyCareTeamSectionProps) {
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  // Care team members are automatically whitelisted via pet_care_team_members junction table
  // No need to track whitelisting separately

  const handleCall = async (phone?: string) => {
    if (!phone) return;

    const phoneUrl = `tel:${phone}`;
    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert("Phone", `Phone: ${phone}`, [
          { text: "OK", style: "cancel" },
        ]);
      }
    } catch (error) {
      Alert.alert("Phone", `Phone: ${phone}`, [
        { text: "OK", style: "cancel" },
      ]);
    }
  };

  const router = useRouter();

  const handleEmail = async (email?: string) => {
    if (!email) return;
    // Navigate to messages screen with pre-filled email
    router.push({
      pathname: "/(home)/messages",
      params: { email },
    });
  };

  // Build the care team list
  // All care team members are automatically whitelisted
  const allMembers: VetInformation[] = [];

  careTeamMembers.forEach((member) => {
    allMembers.push(member);
  });

  // Group by type for "Add" buttons
  const hasMemberByType: Record<CareTeamMemberType, boolean> = {
    veterinarian: false,
    dog_walker: false,
    groomer: false,
    pet_sitter: false,
    boarding: false,
  };

  careTeamMembers.forEach((member) => {
    const memberType = (member as any).type as CareTeamMemberType | undefined;
    if (memberType) {
      hasMemberByType[memberType] = true;
    }
  });

  const renderContactCard = (member: VetInformation) => {
    const type = ((member as any).type as CareTeamMemberType) || "veterinarian";
    const icon = getTypeIcon(type);
    const iconType = getIconType(type);
    const displayName = member.vet_name || member.clinic_name;
    const typeLabel = getTypeLabel(type);
    const typeColor = getTypeColor(type);
    const typeBgColor = getTypeBackgroundColor(type, isDarkMode);

    return (
      <TouchableOpacity
        key={member.id}
        onPress={readOnly ? undefined : () => onEditMember?.(member)}
        activeOpacity={readOnly ? 1 : 0.7}
        disabled={readOnly}
        className="mb-3"
      >
        <LinearGradient
          colors={
            isDarkMode
              ? ["rgba(28, 33, 40, 0.8)", "rgba(28, 33, 40, 0.4)"]
              : ["#FFFFFF", "#F8FAFA"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            borderRadius: 16,
            borderWidth: isDarkMode ? 1 : 0,
            borderColor: theme.border,
            // Shadow for iOS - matches Tailwind shadow-lg
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 15,
            // Shadow for Android
            elevation: 10,
          }}
        >
          {/* Icon */}
          <View
            className="w-12 h-12 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: typeBgColor }}
          >
            {iconType === "material" ? (
              <MaterialCommunityIcons
                name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={24}
                color={typeColor}
              />
            ) : (
              <Ionicons
                name={icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={typeColor}
              />
            )}
          </View>

          {/* Info */}
          <View className="flex-1">
            <Text
              className="text-lg font-bold"
              style={{ color: theme.foreground }}
            >
              {displayName}
            </Text>
            <Text className="text-base" style={{ color: theme.secondary }}>
              {typeLabel}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-2">
            {member.phone && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleCall(member.phone);
                }}
                className="w-11 h-11 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: isDarkMode ? theme.border + "40" : "#E5E7EB",
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={theme.secondary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleEmail(member.email);
              }}
              className="w-11 h-11 rounded-xl items-center justify-center"
              style={{
                backgroundColor: isDarkMode ? theme.border + "40" : "#E5E7EB",
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-outline" size={20} color={theme.secondary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View className="px-4 mb-6">
      {/* Section Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center flex-1">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: `${theme.primary}20` }}
          >
            <Ionicons name="people-outline" size={20} color={theme.primary} />
          </View>
          <View className="flex-1">
            <Text
              className="text-xl font-bold"
              style={{ color: theme.foreground }}
            >
              My Care Team
            </Text>
            <Text className="text-base" style={{ color: theme.secondary }}>
              {allMembers.length} contact{allMembers.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
        {!readOnly && (
          <TouchableOpacity
            onPress={() => onAddMember("veterinarian")}
            className="px-4 py-2 rounded-xl flex-row items-center"
            style={{ backgroundColor: theme.primary }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text
              className="text-base font-semibold ml-1"
              style={{ color: "#fff" }}
            >
              Add
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View>
        {/* Contact List */}
        {allMembers.length > 0 && (
          <View>{allMembers.map((member) => renderContactCard(member))}</View>
        )}

        {/* Empty State */}
        {allMembers.length === 0 && (
          <View className="items-center justify-center py-8">
            <Text className="text-lg" style={{ color: theme.secondary }}>
              No care team members yet
            </Text>
          </View>
        )}

        {/* Add Buttons for each type - Only show if no members exist and not readOnly */}
        {!readOnly && allMembers.length === 0 && (
          <>
            {!hasMemberByType.veterinarian && (
              <TouchableOpacity
                onPress={() => onAddMember("veterinarian")}
                className="flex-row items-center rounded-2xl p-4"
                style={{
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: theme.border,
                }}
                activeOpacity={0.7}
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-3"
                  style={{
                    backgroundColor: getTypeBackgroundColor(
                      "veterinarian",
                      isDarkMode
                    ),
                  }}
                >
                  <MaterialCommunityIcons
                    name="stethoscope"
                    size={24}
                    color={getTypeColor("veterinarian")}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-lg font-semibold"
                    style={{ color: theme.foreground }}
                  >
                    Add Veterinarian
                  </Text>
                  <Text
                    className="text-base"
                    style={{ color: theme.secondary }}
                  >
                    Add your vet's contact details
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {!hasMemberByType.dog_walker && (
              <TouchableOpacity
                onPress={() => onAddMember("dog_walker")}
                className="flex-row items-center rounded-2xl p-4"
                style={{
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: theme.border,
                }}
                activeOpacity={0.7}
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-3"
                  style={{
                    backgroundColor: getTypeBackgroundColor(
                      "dog_walker",
                      isDarkMode
                    ),
                  }}
                >
                  <MaterialCommunityIcons
                    name="paw"
                    size={24}
                    color={getTypeColor("dog_walker")}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-lg font-semibold"
                    style={{ color: theme.foreground }}
                  >
                    Add Dog Walker
                  </Text>
                  <Text
                    className="text-base"
                    style={{ color: theme.secondary }}
                  >
                    Add your dog walker's contact details
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {!hasMemberByType.groomer && (
              <TouchableOpacity
                onPress={() => onAddMember("groomer")}
                className="flex-row items-center rounded-2xl p-4"
                style={{
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: theme.border,
                }}
                activeOpacity={0.7}
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-3"
                  style={{
                    backgroundColor: getTypeBackgroundColor(
                      "groomer",
                      isDarkMode
                    ),
                  }}
                >
                  <MaterialCommunityIcons
                    name="content-cut"
                    size={24}
                    color={getTypeColor("groomer")}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-lg font-semibold"
                    style={{ color: theme.foreground }}
                  >
                    Add Groomer
                  </Text>
                  <Text
                    className="text-base"
                    style={{ color: theme.secondary }}
                  >
                    Add your groomer's contact details
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {!hasMemberByType.pet_sitter && (
              <TouchableOpacity
                onPress={() => onAddMember("pet_sitter")}
                className="flex-row items-center rounded-2xl p-4"
                style={{
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: theme.border,
                }}
                activeOpacity={0.7}
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-3"
                  style={{
                    backgroundColor: getTypeBackgroundColor(
                      "pet_sitter",
                      isDarkMode
                    ),
                  }}
                >
                  <MaterialCommunityIcons
                    name="heart"
                    size={24}
                    color={getTypeColor("pet_sitter")}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-lg font-semibold"
                    style={{ color: theme.foreground }}
                  >
                    Add Pet Sitter
                  </Text>
                  <Text
                    className="text-base"
                    style={{ color: theme.secondary }}
                  >
                    Add your pet sitter's contact details
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {!hasMemberByType.boarding && (
              <TouchableOpacity
                onPress={() => onAddMember("boarding")}
                className="flex-row items-center rounded-2xl p-4"
                style={{
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: theme.border,
                }}
                activeOpacity={0.7}
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-3"
                  style={{
                    backgroundColor: getTypeBackgroundColor(
                      "boarding",
                      isDarkMode
                    ),
                  }}
                >
                  <MaterialCommunityIcons
                    name="home"
                    size={24}
                    color={getTypeColor("boarding")}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-lg font-semibold"
                    style={{ color: theme.foreground }}
                  >
                    Add Boarding Facility
                  </Text>
                  <Text
                    className="text-base"
                    style={{ color: theme.secondary }}
                  >
                    Add your boarding facility's contact details
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}
