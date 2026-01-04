import BottomNavBar from "@/components/home/BottomNavBar";
import { ChatProvider } from "@/context/chatContext";
import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { usePets } from "@/context/petsContext";
import {
  createHouseholdInvite,
  deactivateInvite,
  getMyHouseholdInvites,
  HouseholdInvite,
  removeHouseholdMember,
  getMyHouseholdMembers,
  HouseholdMember,
} from "@/services/householdInvites";
import { getAllCareTeamMembers, createVetInformation } from "@/services/vetInformation";
import { CareTeamMemberType, VetInformation } from "@/services/vetInformation";
import { linkCareTeamMemberToPet } from "@/services/careTeamMembers";
import { CareTeamMemberModal } from "@/components/home/CareTeamMemberModal";
import { TablesInsert } from "@/database.types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";

// Helper function to get icon for care team member type
const getTypeIcon = (type: CareTeamMemberType | null): keyof typeof MaterialCommunityIcons.glyphMap => {
  if (!type) return "stethoscope";
  
  const icons: Record<CareTeamMemberType, keyof typeof MaterialCommunityIcons.glyphMap> = {
    veterinarian: "stethoscope",
    dog_walker: "paw",
    groomer: "content-cut",
    pet_sitter: "heart",
    boarding: "home",
  };
  return icons[type];
};

// Helper function to get initials from name
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

export default function FamilyAccess() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { pets } = usePets();
  const queryClient = useQueryClient();
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedMemberType, setSelectedMemberType] = useState<CareTeamMemberType>("veterinarian");

  // Fetch care team members
  const { data: careTeamMembers = [], isLoading: loadingCareTeam } = useQuery<VetInformation[]>({
    queryKey: ["all_care_team_members"],
    queryFn: getAllCareTeamMembers,
  });

  // Fetch invites
  const { data: invites = [], isLoading: loadingInvites } = useQuery<HouseholdInvite[]>({
    queryKey: ["household_invites"],
    queryFn: getMyHouseholdInvites,
  });

  // Fetch household members
  const { data: members = [], isLoading: loadingMembers } = useQuery<HouseholdMember[]>({
    queryKey: ["household_members"],
    queryFn: getMyHouseholdMembers,
  });

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: createHouseholdInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household_invites"] });
      setGenerating(false);
      Alert.alert("Success", "Invite code generated successfully");
    },
    onError: (error: any) => {
      setGenerating(false);
      Alert.alert("Error", error.message || "Failed to generate invite code");
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: removeHouseholdMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household_members"] });
      Alert.alert("Success", "Household member removed");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to remove household member");
    },
  });

  const handleGenerateInvite = async () => {
    setGenerating(true);
    createInviteMutation.mutate(30); // 30 days expiry
  };

  const handleShowQRCode = (code: string) => {
    setShowQRCode(code);
  };

  const handleRemoveMember = (memberId: string) => {
    Alert.alert(
      "Remove Member",
      "Are you sure you want to remove this household member?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeMemberMutation.mutate(memberId),
        },
      ]
    );
  };

  // Handle care team member actions
  const handleCall = async (phone?: string) => {
    if (!phone) return;
    const phoneUrl = `tel:${phone}`;
    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert("Phone", `Phone: ${phone}`);
      }
    } catch (error) {
      Alert.alert("Phone", `Phone: ${phone}`);
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
        Alert.alert("Email", `Email: ${email}`);
      }
    } catch (error) {
      Alert.alert("Email", `Email: ${email}`);
    }
  };

  const handleRemoveCareTeamMember = (memberId: string) => {
    Alert.alert(
      "Remove Care Team Member",
      "Are you sure you want to remove this care team member?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            // TODO: Implement remove care team member
            Alert.alert("Info", "Remove functionality will be implemented");
          },
        },
      ]
    );
  };

  // Handle adding a new care team member
  const handleAddCareTeamMember = async (
    memberData: TablesInsert<"vet_information">
  ) => {
    if (pets.length === 0) {
      Alert.alert("Error", "You need to have at least one pet to add a care team member");
      return;
    }

    try {
      // Create the vet_information record
      const newMember = await createVetInformation(memberData);

      // Link the care team member to all user's pets
      // (Since this is the "Care Team & Family Access" screen, we link to all pets)
      const linkPromises = pets.map((pet) =>
        linkCareTeamMemberToPet(pet.id, newMember.id)
      );
      await Promise.all(linkPromises);

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["all_care_team_members"] });

      Alert.alert("Success", "Care team member added successfully");
    } catch (error) {
      console.error("Error adding care team member:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to add care team member"
      );
      throw error;
    }
  };

  // Count unique care team members (contacts that can communicate)
  const uniqueCareTeamCount = new Set(careTeamMembers.map((m) => m.email)).size;

  // Check if user is owner (household_owner_id matches user.id)
  const isOwner = (member: HouseholdMember) => member.household_owner_id === user?.id;

  return (
    <ChatProvider>
      <View className="flex-1" style={{ backgroundColor: "#0A0A0A" }}>
        {/* Header */}
        <View className="px-6 pt-14 pb-4">
          <View className="flex-row items-center mb-4">
            <Pressable
              onPress={() => router.back()}
              className="mr-4 active:opacity-70"
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text className="text-3xl font-bold flex-1" style={{ color: "#FFFFFF" }}>
              Care Team & Family Access
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* My Care Team Section */}
          <View className="mb-8">
            {/* Section Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <MaterialCommunityIcons name="account-group" size={24} color="#FFFFFF" style={{ marginRight: 12 }} />
                <View className="flex-1">
                  <Text className="text-xl font-bold" style={{ color: "#FFFFFF" }}>
                    My Care Team
                  </Text>
                  <Text className="text-sm" style={{ color: "#9CA3AF" }}>
                    {uniqueCareTeamCount} contacts can communicate
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  setSelectedMemberType("veterinarian");
                  setShowAddMemberModal(true);
                }}
                className="px-4 py-2 rounded-lg active:opacity-70"
                style={{ backgroundColor: "#374151" }}
              >
                <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>
                  + Add
                </Text>
              </Pressable>
            </View>

            {/* Care Team Members List */}
            {loadingCareTeam ? (
              <ActivityIndicator size="small" color="#5FC4C0" />
            ) : careTeamMembers.length === 0 ? (
              <Text className="text-base" style={{ color: "#9CA3AF" }}>
                No care team members yet.
              </Text>
            ) : (
              careTeamMembers.map((member) => (
                <View
                  key={member.id}
                  className="rounded-2xl p-4 mb-3 flex-row items-center"
                  style={{ backgroundColor: "#1F1F1F" }}
                >
                  {/* Icon */}
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: "#374151" }}
                  >
                    <MaterialCommunityIcons
                      name={getTypeIcon(member.type as CareTeamMemberType)}
                      size={24}
                      color="#5FC4C0"
                    />
                  </View>

                  {/* Member Info */}
                  <View className="flex-1">
                    <Text className="text-base font-semibold mb-1" style={{ color: "#FFFFFF" }}>
                      {member.vet_name}
                    </Text>
                    <Text className="text-sm mb-1" style={{ color: "#9CA3AF" }}>
                      {member.clinic_name}
                    </Text>
                    <Text className="text-sm" style={{ color: "#9CA3AF" }}>
                      {member.email}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row items-center gap-3">
                    {member.phone && (
                      <Pressable
                        onPress={() => handleCall(member.phone)}
                        className="active:opacity-70"
                      >
                        <Ionicons name="call-outline" size={20} color="#5FC4C0" />
                      </Pressable>
                    )}
                    {member.email && (
                      <Pressable
                        onPress={() => handleEmail(member.email)}
                        className="active:opacity-70"
                      >
                        <Ionicons name="mail-outline" size={20} color="#5FC4C0" />
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => handleRemoveCareTeamMember(member.id)}
                      className="active:opacity-70"
                    >
                      <Ionicons name="close-circle" size={20} color="#FF3B30" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Family Access Section */}
          <View className="mb-8">
            {/* Section Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <MaterialCommunityIcons name="account-group-outline" size={24} color="#FFFFFF" style={{ marginRight: 12 }} />
                <Text className="text-xl font-bold flex-1" style={{ color: "#FFFFFF" }}>
                  Family Access
                </Text>
              </View>
              <Pressable
                onPress={handleGenerateInvite}
                disabled={generating}
                className="px-4 py-2 rounded-lg active:opacity-70"
                style={{ backgroundColor: "#374151" }}
              >
                {generating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>
                    Invite
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Household Members List */}
            {loadingMembers ? (
              <ActivityIndicator size="small" color="#5FC4C0" />
            ) : (
              <>
                {/* Current User (Owner) */}
                {user && (
                  <View
                    className="rounded-2xl p-4 mb-3 flex-row items-center justify-between"
                    style={{ backgroundColor: "#1F1F1F" }}
                  >
                    <View className="flex-row items-center flex-1">
                      {/* Avatar */}
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: "#5FC4C0" }}
                      >
                        <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>
                          {getInitials(user.email || "User")}
                        </Text>
                      </View>

                      {/* Member Info */}
                      <View className="flex-1">
                        <Text className="text-base font-semibold mb-1" style={{ color: "#FFFFFF" }}>
                          {user.email?.split("@")[0] || "You"}
                        </Text>
                        <Text className="text-sm" style={{ color: "#9CA3AF" }}>
                          {user.email || ""}
                        </Text>
                      </View>

                      {/* Owner Badge */}
                      <View
                        className="px-3 py-1 rounded-full flex-row items-center"
                        style={{ backgroundColor: "#A855F7" }}
                      >
                        <MaterialCommunityIcons name="crown" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text className="text-xs font-semibold" style={{ color: "#FFFFFF" }}>
                          Owner
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Other Household Members */}
                {members.map((member) => (
                  <View
                    key={member.id}
                    className="rounded-2xl p-4 mb-3 flex-row items-center justify-between"
                    style={{ backgroundColor: "#1F1F1F" }}
                  >
                    <View className="flex-row items-center flex-1">
                      {/* Avatar */}
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: "#5FC4C0" }}
                      >
                        <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>
                          {getInitials(member.user_id)}
                        </Text>
                      </View>

                      {/* Member Info */}
                      <View className="flex-1">
                        <Text className="text-base font-semibold mb-1" style={{ color: "#FFFFFF" }}>
                          {member.user_id.split("@")[0] || member.user_id}
                        </Text>
                        <Text className="text-sm" style={{ color: "#9CA3AF" }}>
                          {member.user_id}
                        </Text>
                      </View>

                      {/* Note: Members don't show owner badge - only the current user (owner) shows it */}

                      {/* Remove Button */}
                      <Pressable
                        onPress={() => handleRemoveMember(member.id)}
                        className="active:opacity-70"
                      >
                        <Ionicons name="close-circle" size={20} color="#FF3B30" />
                      </Pressable>
                    </View>
                  </View>
                ))}

                {members.length === 0 && !user && (
                  <Text className="text-base" style={{ color: "#9CA3AF" }}>
                    No household members yet.
                  </Text>
                )}
              </>
            )}
          </View>
        </ScrollView>

        {/* QR Code Modal */}
        {showQRCode && (
          <View
            className="absolute inset-0 items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.9)" }}
          >
            <View
              className="rounded-2xl p-6 items-center"
              style={{ backgroundColor: "#1F1F1F" }}
            >
              <Text
                className="text-xl font-bold mb-4"
                style={{ color: "#FFFFFF" }}
              >
                Invite Code QR
              </Text>
              <QRCode value={showQRCode} size={200} color="#FFFFFF" backgroundColor="transparent" />
              <Text
                className="text-base mt-4 mb-4"
                style={{ color: "#9CA3AF" }}
              >
                {showQRCode}
              </Text>
              <Pressable
                onPress={() => setShowQRCode(null)}
                className="rounded-xl py-3 px-6 active:opacity-70"
                style={{ backgroundColor: "#5FC4C0" }}
              >
                <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Add Care Team Member Modal */}
        {pets.length > 0 && (
          <CareTeamMemberModal
            visible={showAddMemberModal}
            onClose={() => setShowAddMemberModal(false)}
            onSave={handleAddCareTeamMember}
            memberType={selectedMemberType}
            onTypeChange={setSelectedMemberType}
            petId={pets[0].id} // Required prop, but we'll link to all pets in handleAddCareTeamMember
          />
        )}

        {/* Bottom Navigation */}
        <BottomNavBar activeTab="profile" />
      </View>
    </ChatProvider>
  );
}
