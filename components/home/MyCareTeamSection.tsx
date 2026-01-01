import { useTheme } from "@/context/themeContext";
import { Tables } from "@/database.types";
import { addEmail, getWhitelistedEmails } from "@/services/petEmailList";
import { CareTeamMemberType, VetInformation } from "@/services/vetInformation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import React, { useMemo } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

type VetInfo = Tables<"vet_information">;

type MyCareTeamSectionProps = {
  vetInfo?: VetInfo | null;
  careTeamMembers?: VetInformation[];
  onAddMember: (type: CareTeamMemberType) => void;
  onEditMember?: (member: VetInformation) => void;
  petId?: string;
};

const getTypeIcon = (type: CareTeamMemberType | null): keyof typeof Ionicons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap => {
  if (!type) return "medical-outline";
  
  const icons: Record<CareTeamMemberType, keyof typeof Ionicons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap> = {
    veterinarian: "medical-outline",
    dog_walker: "walk-outline",
    groomer: "cut-outline",
    pet_sitter: "home-outline",
    boarding: "business-outline",
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

const getIconType = (type: CareTeamMemberType | null): "ionicons" | "material" => {
  if (!type) return "ionicons";
  
  // Material icons for some types
  if (type === "groomer") return "material";
  return "ionicons";
};

export default function MyCareTeamSection({
  vetInfo,
  careTeamMembers = [],
  onAddMember,
  onEditMember,
  petId,
}: MyCareTeamSectionProps) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  // Fetch whitelisted emails for this pet
  const { data: whitelistedEmails = [] } = useQuery({
    queryKey: ["whitelisted_emails", petId],
    queryFn: () => getWhitelistedEmails(petId!),
    enabled: !!petId,
  });

  // Mutation to block/unblock an email
  const blockEmailMutation = useMutation({
    mutationFn: async ({ email, isBlocked }: { email: string; isBlocked: boolean }) => {
      if (!petId) throw new Error("Pet ID is required");
      // Use addEmail which handles both creating and updating the email entry
      // If email exists, it will update the is_blocked status
      // If email doesn't exist, it will create a new entry with the specified block status
      return await addEmail(petId, email, isBlocked);
    },
    onSuccess: () => {
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["whitelisted_emails", petId] });
    },
    onError: (error) => {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to update email status");
    },
  });

  // Create a set of whitelisted email addresses for quick lookup
  const whitelistedEmailSet = useMemo(() => {
    return new Set(whitelistedEmails.map((e) => e.email_id.toLowerCase()));
  }, [whitelistedEmails]);

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
    } catch (error) {
      Alert.alert("Phone", `Phone: ${phone}`, [{ text: "OK", style: "cancel" }]);
    }
  };

  const handleEmail = async (email?: string) => {
    if (!email) return;

    const emailUrl = `mailto:${email}`;
    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert("Email", `Email: ${email}`, [{ text: "OK", style: "cancel" }]);
      }
    } catch (error) {
      Alert.alert("Email", `Email: ${email}`, [{ text: "OK", style: "cancel" }]);
    }
  };

  // Check if a member's email is whitelisted
  const isWhitelisted = (email: string | null | undefined): boolean => {
    if (!email) return false;
    return whitelistedEmailSet.has(email.toLowerCase());
  };

  // Build the care team list
  const allMembers: VetInformation[] = [];

  // Add primary vet if exists
  if (vetInfo) {
    allMembers.push({ ...vetInfo, type: "veterinarian" } as VetInformation);
  }

  // Add other care team members (excluding primary vet if already added)
  careTeamMembers.forEach((member) => {
    if (!vetInfo || member.id !== vetInfo.id) {
      allMembers.push(member);
    }
  });

  // Separate members into whitelisted and not whitelisted
  const whitelistedMembers = allMembers.filter((member) => isWhitelisted(member.email));
  const notWhitelistedMembers = allMembers.filter((member) => !isWhitelisted(member.email));

  // Group by type for "Add" buttons
  const hasMemberByType: Record<CareTeamMemberType, boolean> = {
    veterinarian: !!vetInfo,
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
    const displayName = member.vet_name;
    const businessName = member.clinic_name;
    const email = member.email;
    const isMemberWhitelisted = isWhitelisted(email);

    // Get appropriate icon based on type
    let displayIcon: keyof typeof Ionicons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap = icon;
    if (type === "dog_walker") {
      displayIcon = "people-outline"; // Two overlapping circles
    } else if (type === "groomer") {
      displayIcon = "cut-outline";
    } else if (type === "pet_sitter") {
      displayIcon = "home-outline";
    } else if (type === "veterinarian") {
      displayIcon = "medical-outline";
    }

    return (
      <TouchableOpacity
        key={member.id}
        onPress={() => onEditMember?.(member)}
        activeOpacity={0.7}
        className="mb-3"
      >
        <View
          className="flex-row items-center rounded-2xl p-4"
          style={{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          }}
        >
          {/* Icon */}
          <View
            className="w-12 h-12 rounded-xl items-center justify-center mr-3"
            style={{ 
              backgroundColor: theme.border + "40",
            }}
          >
            {iconType === "material" ? (
              <MaterialCommunityIcons
                name={displayIcon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={22}
                color={theme.primary}
              />
            ) : (
              <Ionicons
                name={displayIcon as keyof typeof Ionicons.glyphMap}
                size={22}
                color={theme.primary}
              />
            )}
          </View>

          {/* Info */}
          <View className="flex-1">
            <Text
              className="text-base font-semibold"
              style={{ color: theme.foreground }}
            >
              {displayName}
            </Text>
            <Text className="text-sm mb-0.5" style={{ color: theme.secondary }}>
              {businessName}
            </Text>
            <Text className="text-sm" style={{ color: theme.secondary }}>
              {email}
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
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: theme.border + "40" }}
                activeOpacity={0.7}
              >
                <Ionicons name="call-outline" size={18} color={theme.secondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleEmail(member.email);
              }}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: theme.border + "40" }}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-outline" size={18} color={theme.secondary} />
            </TouchableOpacity>
            {/* Status Indicator - Clickable for whitelisted members */}
            {isMemberWhitelisted ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  if (member.email && petId) {
                    Alert.alert(
                      "Block Contact",
                      `Are you sure you want to block ${member.email}? They will be moved to the "Not whitelisted" section.`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Block",
                          style: "destructive",
                          onPress: () => {
                            blockEmailMutation.mutate({ email: member.email!, isBlocked: true });
                          },
                        },
                      ]
                    );
                  }
                }}
                className="w-10 h-10 rounded-full items-center justify-center relative"
                style={{
                  backgroundColor: "#22C55E",
                }}
                activeOpacity={0.7}
                disabled={blockEmailMutation.isPending}
              >
                <Ionicons
                  name="person"
                  size={18}
                  color="#fff"
                />
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    backgroundColor: "#fff",
                    borderRadius: 8,
                    width: 12,
                    height: 12,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="checkmark"
                    size={8}
                    color="#22C55E"
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{
                  backgroundColor: theme.border + "40",
                }}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={theme.secondary}
                />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View
      className="rounded-2xl mb-6"
      style={{
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      {/* Section Header */}
      <View className="flex-row items-center justify-between p-4 border-b" style={{ borderBottomColor: theme.border + "40" }}>
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <View
              className="w-8 h-8 rounded-full items-center justify-center mr-2"
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Ionicons name="people-outline" size={18} color={theme.primary} />
            </View>
            <Text
              className="text-xl font-bold"
              style={{ color: theme.foreground }}
            >
              My Care Team
            </Text>
          </View>
          <Text className="text-sm ml-10" style={{ color: theme.secondary }}>
            {whitelistedMembers.length} whitelisted contact{whitelistedMembers.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onAddMember("veterinarian")}
          className="px-4 py-2 rounded-xl flex-row items-center"
          style={{ backgroundColor: theme.primary }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-sm font-semibold ml-1" style={{ color: "#fff" }}>
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="p-4">
        {/* Can communicate Section */}
        {whitelistedMembers.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
              <Text className="text-base font-semibold ml-2" style={{ color: "#22C55E" }}>
                Can communicate
              </Text>
            </View>
            {whitelistedMembers.map((member) => renderContactCard(member))}
          </View>
        )}

        {/* Not whitelisted Section */}
        {notWhitelistedMembers.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Ionicons name="close-circle" size={18} color="#EF4444" />
              <Text className="text-base font-semibold ml-2" style={{ color: theme.foreground }}>
                Not whitelisted
              </Text>
            </View>
            {notWhitelistedMembers.map((member) => renderContactCard(member))}
          </View>
        )}

        {/* Empty State */}
        {allMembers.length === 0 && (
          <View className="items-center justify-center py-8">
            <Text className="text-base" style={{ color: theme.secondary }}>
              No care team members yet
            </Text>
          </View>
        )}

        {/* Add Buttons for each type - Only show if no members exist */}
        {allMembers.length === 0 && (
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
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Ionicons name="medical-outline" size={24} color={theme.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
              >
                Add Veterinarian
              </Text>
              <Text className="text-sm" style={{ color: theme.secondary }}>
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
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Ionicons name="walk-outline" size={24} color={theme.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
              >
                Add Dog Walker
              </Text>
              <Text className="text-sm" style={{ color: theme.secondary }}>
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
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <MaterialCommunityIcons name="content-cut" size={24} color={theme.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
              >
                Add Groomer
              </Text>
              <Text className="text-sm" style={{ color: theme.secondary }}>
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
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Ionicons name="home-outline" size={24} color={theme.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
              >
                Add Pet Sitter
              </Text>
              <Text className="text-sm" style={{ color: theme.secondary }}>
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
                style={{ backgroundColor: `${theme.primary}20` }}
              >
                <Ionicons name="business-outline" size={24} color={theme.primary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.foreground }}
                >
                  Add Boarding Facility
                </Text>
                <Text className="text-sm" style={{ color: theme.secondary }}>
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
