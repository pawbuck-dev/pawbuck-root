import BottomNavBar from "@/components/home/BottomNavBar";
import {
  CareTeamMemberModal,
  CareTeamMemberSaveData,
} from "@/components/home/CareTeamMemberModal";
import { useAuth } from "@/context/authContext";
import { ChatProvider } from "@/context/chatContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { TablesInsert } from "@/database.types";
import { linkCareTeamMemberToMultiplePets } from "@/services/careTeamMembers";
import {
  createHouseholdInvite,
  getMyHouseholdInvites,
  getMyHouseholdMembers,
  HouseholdInvite,
  HouseholdMember,
  removeHouseholdMember
} from "@/services/householdInvites";
import {
  CareTeamMemberType,
  createVetInformation,
  findExistingCareTeamMember,
  getAllCareTeamMembers,
  updateVetInformation,
  VetInformation,
} from "@/services/vetInformation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
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
    onSuccess: (invite) => {
      queryClient.invalidateQueries({ queryKey: ["household_invites"] });
      setGenerating(false);
      // Show the QR code modal with the generated invite code
      setShowQRCode(invite.code);
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
    // Navigate to messages screen with pre-filled email
    router.push({
      pathname: "/(home)/messages",
      params: { email },
    });
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
  const handleAddCareTeamMember = async (data: CareTeamMemberSaveData) => {
    if (pets.length === 0) {
      Alert.alert("Error", "You need to have at least one pet to add a care team member");
      return;
    }

    const { memberData, selectedPetIds } = data;

    try {
      // Check for existing care team member by email or phone (deduplication)
      const existingMember = await findExistingCareTeamMember(
        memberData.email,
        memberData.phone
      );

      let careTeamMemberId: string;

      if (existingMember) {
        // Use existing record - optionally update it with new details
        await updateVetInformation(existingMember.id, memberData);
        careTeamMemberId = existingMember.id;
      } else {
        // Create the vet_information record
        const newMember = await createVetInformation(memberData as TablesInsert<"vet_information">);
        careTeamMemberId = newMember.id;
      }

      // Link the care team member to selected pets
      await linkCareTeamMemberToMultiplePets(selectedPetIds, careTeamMemberId);

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["all_care_team_members"] });
      selectedPetIds.forEach((petId) => {
        queryClient.invalidateQueries({ queryKey: ["care_team_members", petId] });
      });

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
                      name={getTypeIcon((member as any).type as CareTeamMemberType)}
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

        {/* Invite Family Member Modal */}
        <Modal
          visible={!!showQRCode}
          transparent
          animationType="fade"
          onRequestClose={() => setShowQRCode(null)}
        >
          <View
            className="flex-1 items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.9)" }}
          >
            <View
              className="rounded-2xl p-6 mx-4"
              style={{ backgroundColor: "#1F1F1F", maxWidth: 400, width: "90%" }}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center flex-1">
                  <Ionicons name="person-add" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text
                    className="text-xl font-bold flex-1"
                    style={{ color: "#FFFFFF" }}
                  >
                    Invite Family Member
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowQRCode(null)}
                  className="active:opacity-70"
                >
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </Pressable>
              </View>

              {/* Description */}
              <Text
                className="text-sm mb-6"
                style={{ color: "#9CA3AF" }}
              >
                Share this code with family members so they can track your pets
              </Text>

              {/* QR Code */}
              {showQRCode && (
                <View className="items-center mb-6">
                  <View
                    className="rounded-xl p-4 mb-4"
                    style={{ backgroundColor: "#FFFFFF" }}
                  >
                    <QRCode value={showQRCode} size={200} color="#000000" backgroundColor="#FFFFFF" />
                  </View>

                  {/* Or share this code */}
                  <Text
                    className="text-sm mb-3"
                    style={{ color: "#9CA3AF" }}
                  >
                    Or share this code:
                  </Text>

                  {/* Code with copy button */}
                  <View className="flex-row items-center gap-3">
                    <Text
                      className="text-xl font-bold"
                      style={{ color: "#5FC4C0" }}
                    >
                      {showQRCode}
                    </Text>
                    <Pressable
                      onPress={async () => {
                        if (showQRCode) {
                          await Clipboard.setStringAsync(showQRCode);
                          Alert.alert("Copied", "Invite code copied to clipboard");
                        }
                      }}
                      className="active:opacity-70"
                    >
                      <View
                        className="w-8 h-8 rounded items-center justify-center"
                        style={{ backgroundColor: "#5FC4C020" }}
                      >
                        <Ionicons name="copy-outline" size={18} color="#5FC4C0" />
                      </View>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Instructions */}
              <View
                className="rounded-xl p-4 mb-4"
                style={{ backgroundColor: "#374151" }}
              >
                <Text
                  className="text-sm"
                  style={{ color: "#9CA3AF" }}
                >
                  Family members can enter this code when they select 'Track My Household Pet' during sign up
                </Text>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Care Team Member Modal */}
        {pets.length > 0 && (
          <CareTeamMemberModal
            visible={showAddMemberModal}
            onClose={() => setShowAddMemberModal(false)}
            onSave={handleAddCareTeamMember}
            memberType={selectedMemberType}
            onTypeChange={setSelectedMemberType}
            allPets={pets}
            petId={pets[0].id} // Required prop, but we'll link to all pets in handleAddCareTeamMember
          />
        )}

        {/* Bottom Navigation */}
        <BottomNavBar activeTab="profile" />
      </View>
    </ChatProvider>
  );
}
