import BottomNavBar from "@/components/home/BottomNavBar";
import { SettingsSubscreenHeader } from "@/components/layout/SettingsSubscreenHeader";
import { CareTeamEmptyStateCard } from "@/components/home/CareTeamEmptyStateCard";
import { CareTeamMemberContactCard } from "@/components/home/CareTeamMemberContactCard";
import { CTA } from "@/components/ui/CTA";
import {
  CareTeamMemberModal,
  CareTeamMemberSaveData,
} from "@/components/home/CareTeamMemberModal";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/context/petsContext";
import { useSubscription } from "@/context/subscriptionContext";
import { useTheme } from "@/context/themeContext";
import { useSafeSenders, validateEmail } from "@/hooks/useSafeSenders";
import { TablesInsert } from "@/database.types";
import { linkCareTeamMemberToAllUserPets } from "@/services/careTeamMembers";
import {
  createHouseholdInvite,
  getMyHouseholdMembers,
  HouseholdMember,
  removeHouseholdMember,
} from "@/services/householdInvites";
import { PetFamilyRole, sendPetFamilyInvite } from "@/services/petFamilyInvites";
import {
  CareTeamMemberType,
  createVetInformation,
  findExistingCareTeamMember,
  getAllCareTeamMembers,
  updateVetInformation,
  VetInformation,
} from "@/services/vetInformation";
import { supabase } from "@/utils/supabase";
import { resolveProfileHeroDisplayName } from "@/utils/userDisplayIdentity";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
    unknown: "help-circle-outline",
  };
  return icons[type];
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

/** Light theme — Care Team screen (final Figma ref) */
const CARE_TEAM_LIGHT = {
  pageBg: "#F5F7F8",
  cardBg: "#FFFFFF",
  title: "#111111",
  muted: "#757575",
  iconWell: "#E0E0E0",
  border: "#E4E7E7",
  /** Ghost pills: white fill, thin black border */
  ghostBorder: "#111111",
} as const;

export default function FamilyAccess() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  const { user } = useAuth();
  const { pets } = usePets();
  const { ensurePlan } = useSubscription();
  const queryClient = useQueryClient();
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<PetFamilyRole>("contributor");
  const [invitePetId, setInvitePetId] = useState<string | undefined>(undefined);
  const [sendingEmailInvite, setSendingEmailInvite] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedMemberType, setSelectedMemberType] = useState<CareTeamMemberType>("veterinarian");
  const [selectedMember, setSelectedMember] = useState<VetInformation | null>(null);
  const [newSafeSenderEmail, setNewSafeSenderEmail] = useState("");
  const [isAddingSafeSender, setIsAddingSafeSender] = useState(false);
  const [editingSafeSenderId, setEditingSafeSenderId] = useState<number | null>(null);
  const [editingSafeSenderEmail, setEditingSafeSenderEmail] = useState("");
  const [careTeamAddedSuccessVisible, setCareTeamAddedSuccessVisible] = useState(false);

  // Fetch care team members
  const { data: careTeamMembers = [], isLoading: loadingCareTeam } = useQuery<VetInformation[]>({
    queryKey: ["all_care_team_members"],
    queryFn: getAllCareTeamMembers,
  });

  const firstPetId = pets[0]?.id;
  const {
    whitelistedEmails,
    isLoading: loadingSafeSenders,
    addWhitelistedEmail,
    updateWhitelistedEmail,
    deleteWhitelistedEmail,
    isPending: isSafeSenderPending,
    isAdding: isSafeSenderAdding,
    isUpdating: isSafeSenderUpdating,
  } = useSafeSenders({ petId: firstPetId, enabled: !!firstPetId });

  const careTeamEmailSet = new Set(
    careTeamMembers.map((member) => member.email?.toLowerCase().trim()).filter(Boolean)
  );
  const safeSenderEmails = whitelistedEmails.filter(
    (emailItem) => !careTeamEmailSet.has(emailItem.email_id.toLowerCase().trim())
  );

  const { data: members = [], isLoading: loadingMembers } = useQuery<HouseholdMember[]>({
    queryKey: ["household_members"],
    queryFn: getMyHouseholdMembers,
  });

  const createInviteMutation = useMutation({
    mutationFn: createHouseholdInvite,
    onSuccess: (invite) => {
      queryClient.invalidateQueries({ queryKey: ["household_invites"] });
      setGenerating(false);
      setShowQRCode(invite.code);
    },
    onError: (error: Error) => {
      setGenerating(false);
      Alert.alert("Error", error.message || "Failed to generate invite code");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: removeHouseholdMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household_members"] });
      Alert.alert("Success", "Household member removed");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to remove household member");
    },
  });

  const handleGenerateInvite = () => {
    ensurePlan("family", () => {
      setGenerating(true);
      createInviteMutation.mutate(30);
    }, "family_access_invite");
  };

  const effectiveInvitePetId = invitePetId ?? pets[0]?.id;

  const handleSendEmailInvite = () => {
    if (!effectiveInvitePetId) {
      Alert.alert("No pet", "Add a pet before inviting family members.");
      return;
    }
    const email = inviteEmail.trim();
    if (!validateEmail(email)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }
    ensurePlan("family", async () => {
      setSendingEmailInvite(true);
      try {
        const result = await sendPetFamilyInvite({
          petId: effectiveInvitePetId,
          email,
          role: inviteRole,
        });
        setInviteEmail("");
        Alert.alert(
          "Invite sent",
          result.emailSent === false
            ? `Invite created for ${email}. Email delivery may be delayed.`
            : `We sent an invite to ${email}.`
        );
      } catch (e: unknown) {
        Alert.alert("Error", e instanceof Error ? e.message : "Failed to send invite");
      } finally {
        setSendingEmailInvite(false);
      }
    }, "family_access_invite");
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

  const handleEditCareTeamMember = (member: VetInformation) => {
    setSelectedMember(member);
    setSelectedMemberType(
      ((member as any).type as CareTeamMemberType) || "veterinarian"
    );
    setShowAddMemberModal(true);
  };

  const handleRemoveCareTeamMember = (memberId: string) => {
    const member = careTeamMembers.find((m) => m.id === memberId);
    if (!member) return;

    Alert.alert(
      "Remove Care Team Member",
      `Are you sure you want to remove ${member.vet_name || member.clinic_name} from your care team?`,
      [
        { 
          text: "Cancel", 
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setSelectedMember(member);
            await handleDeleteCareTeamMember();
          },
        },
      ]
    );
  };

  // Handle adding or updating a care team member
  const handleSaveCareTeamMember = async (data: CareTeamMemberSaveData) => {
    if (pets.length === 0) {
      Alert.alert("Error", "You need to have at least one pet to add a care team member");
      return;
    }

    const { memberData } = data;
    const isEdit = !!selectedMember;

    try {
      let linkedPetIds: string[] = [];
      if (isEdit) {
        // Editing existing member - update the member data
        await updateVetInformation(selectedMember!.id, memberData);
        Alert.alert("Success", "Care team member updated successfully");
      } else {
        // Creating new member - use deduplication logic
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

        // Link the care team member to all user pets
        linkedPetIds = await linkCareTeamMemberToAllUserPets(careTeamMemberId);
      }

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["all_care_team_members"] });
      if (!isEdit) {
        linkedPetIds.forEach((petId) => {
          queryClient.invalidateQueries({ queryKey: ["care_team_members", petId] });
        });
      } else {
        // When editing, invalidate all pets' care team queries
        pets.forEach((pet) => {
          queryClient.invalidateQueries({ queryKey: ["care_team_members", pet.id] });
        });
      }

      setShowAddMemberModal(false);
      setSelectedMember(null);
      if (!isEdit) {
        setCareTeamAddedSuccessVisible(true);
      }
    } catch (error) {
      console.error("Error saving care team member:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : `Failed to ${selectedMember ? "update" : "add"} care team member`
      );
      throw error;
    }
  };

  const handleDeleteCareTeamMember = async () => {
    if (!selectedMember) return;

    try {
      // Get all pets linked to this care team member
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get all user's pets
      const { data: userPets } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", user.id);

      if (userPets) {
        // Unlink from all user's pets
        for (const pet of userPets) {
          try {
            await supabase
              .from("pet_care_team_members")
              .delete()
              .eq("pet_id", pet.id)
              .eq("care_team_member_id", selectedMember.id);
          } catch (err) {
            // Continue even if unlink fails for some pets
            console.error(`Error unlinking from pet ${pet.id}:`, err);
          }
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["all_care_team_members"] });
      if (userPets) {
        userPets.forEach((pet) => {
          queryClient.invalidateQueries({ queryKey: ["care_team_members", pet.id] });
        });
      }

      Alert.alert("Success", "Care team member removed successfully");
      setShowAddMemberModal(false);
      setSelectedMember(null);
    } catch (error) {
      console.error("Error deleting care team member:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to remove care team member"
      );
      throw error;
    }
  };

  const handleAddSafeSender = () => {
    if (!newSafeSenderEmail.trim()) {
      Alert.alert("Required", "Please enter an email address");
      return;
    }
    if (!validateEmail(newSafeSenderEmail.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }
    addWhitelistedEmail(newSafeSenderEmail.trim());
    setNewSafeSenderEmail("");
    setIsAddingSafeSender(false);
  };

  const handleUpdateSafeSender = () => {
    if (!editingSafeSenderEmail.trim()) {
      Alert.alert("Required", "Please enter an email address");
      return;
    }
    if (!validateEmail(editingSafeSenderEmail.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }
    if (editingSafeSenderId) {
      updateWhitelistedEmail(editingSafeSenderId, editingSafeSenderEmail.trim());
      setEditingSafeSenderId(null);
      setEditingSafeSenderEmail("");
    }
  };

  const startEditingSafeSender = (id: number, email: string) => {
    setEditingSafeSenderId(id);
    setEditingSafeSenderEmail(email);
  };

  const cancelEditingSafeSender = () => {
    setEditingSafeSenderId(null);
    setEditingSafeSenderEmail("");
  };

  const cancelAddingSafeSender = () => {
    setIsAddingSafeSender(false);
    setNewSafeSenderEmail("");
  };

  // Count unique care team members (contacts that can communicate)
  const uniqueCareTeamCount = new Set(careTeamMembers.map((m) => m.email)).size;

  const ui = isDarkMode
    ? {
        pageBg: theme.background,
        cardBg: theme.card,
        cardRadius: 20,
        cardPad: 18,
        title: theme.foreground,
        muted: theme.secondary,
        iconWell: "#374151",
        iconFg: theme.primary,
        ghostBorder: theme.border,
        ghostText: theme.foreground,
        inputBorder: theme.border,
        inputBg: theme.card,
        backFab: theme.card,
        cardShadow: {},
      }
    : {
        pageBg: CARE_TEAM_LIGHT.pageBg,
        cardBg: CARE_TEAM_LIGHT.cardBg,
        cardRadius: 24,
        cardPad: 20,
        title: CARE_TEAM_LIGHT.title,
        muted: CARE_TEAM_LIGHT.muted,
        iconWell: CARE_TEAM_LIGHT.iconWell,
        iconFg: CARE_TEAM_LIGHT.title,
        ghostBorder: CARE_TEAM_LIGHT.ghostBorder,
        ghostText: CARE_TEAM_LIGHT.title,
        inputBorder: CARE_TEAM_LIGHT.border,
        inputBg: "#FAFAFA",
        backFab: "#FFFFFF",
        cardShadow: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 3,
        },
      };

  const showSafeSenderInput =
    !!firstPetId &&
    (isAddingSafeSender || (!isDarkMode && safeSenderEmails.length === 0 && !loadingSafeSenders));

  const onSafeSenderCancel = () => {
    if (!isDarkMode && safeSenderEmails.length === 0) {
      setNewSafeSenderEmail("");
      return;
    }
    cancelAddingSafeSender();
  };

  const ghostButtonStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor:
      !isDarkMode && ui.ghostText === CARE_TEAM_LIGHT.title ? "#FFFFFF" : "transparent",
    borderWidth: 1,
    borderColor: ui.ghostBorder,
  };

  /** Same shell as `CareTeamMemberContactCard` / `CareTeamEmptyStateCard` */
  const careTeamTileBorder =
    Platform.OS === "android"
      ? {}
      : {
          borderWidth: 1,
          borderColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        };
  const safeSendersCardStyle = {
    backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    overflow: "hidden" as const,
    ...careTeamTileBorder,
  };

  const familyAccessCardStyle = safeSendersCardStyle;

  const familyIconWellStyle = {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "#EDEDEE",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  const familyNestedRowStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 14,
    borderRadius: 16,
    backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
  };

  const familyInputShellStyle = {
    borderWidth: 1,
    borderColor: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
  };

  const selectChipStyle = (selected: boolean) => ({
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: selected
      ? theme.primary
      : isDarkMode
        ? "rgba(255,255,255,0.15)"
        : "rgba(0,0,0,0.12)",
    backgroundColor: selected ? theme.primary : "transparent",
  });

  const familySectionHeadingStyle = {
    fontSize: 18,
    fontWeight: "500" as const,
    lineHeight: 21.6,
    textTransform: "capitalize" as const,
    marginBottom: 14,
    marginTop: 4,
    color: isDarkMode ? "#FFFFFF" : "#0D0F0F",
  };

  const ownerHero = resolveProfileHeroDisplayName(null, user);
  const ownerInitials = getInitials(
    ownerHero.displayName !== "Add your name" ? ownerHero.displayName : user?.email || "You"
  );

  return (
    <View className="flex-1" style={{ backgroundColor: ui.pageBg }}>
      <SettingsSubscreenHeader title="Manage Access" />

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* My Care Team — empty: same tile as Dashboard; with members: compact summary */}
        {careTeamMembers.length > 0 ? (
          <View
            style={[
              {
                backgroundColor: ui.cardBg,
                borderRadius: ui.cardRadius,
                padding: ui.cardPad,
                marginBottom: 16,
              },
              ui.cardShadow,
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: ui.iconWell,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <MaterialCommunityIcons name="account-group" size={22} color={ui.iconFg} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 18,
                    color: ui.title,
                  }}
                >
                  My Care Team
                </Text>
                <Text
                  style={{
                    fontFamily: "Poppins_400Regular",
                    fontSize: 13,
                    color: ui.muted,
                    marginTop: 4,
                  }}
                >
                  {uniqueCareTeamCount} contacts can communicate
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                setSelectedMember(null);
                setSelectedMemberType("veterinarian");
                setShowAddMemberModal(true);
              }}
              style={ghostButtonStyle}
            >
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 15, color: ui.ghostText }}>+ Add Team</Text>
            </Pressable>
          </View>
        ) : (
          <CareTeamEmptyStateCard
            contactCount={uniqueCareTeamCount}
            loading={loadingCareTeam}
            onAddTeamPress={() => {
              setSelectedMember(null);
              setSelectedMemberType("veterinarian");
              setShowAddMemberModal(true);
            }}
            containerStyle={{ marginBottom: 16 }}
          />
        )}

        {/* Safe Senders */}
        {firstPetId && (
          <View style={safeSendersCardStyle}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "#EDEDEE",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons
                  name="email-check-outline"
                  size={22}
                  color={isDarkMode ? "#FFFFFF" : "#1D2433"}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Safe Senders</Text>
                <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 2 }}>
                  {safeSenderEmails.length} contacts can communicate
                </Text>
              </View>
            </View>

            {loadingSafeSenders ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 12 }} />
            ) : (
              <>
                {safeSenderEmails.length === 0 && (
                  <Text
                    style={{
                      fontSize: 14,
                      lineHeight: 20,
                      color: isDarkMode ? "rgba(255,255,255,0.6)" : "#5A5F6A",
                      marginBottom: 16,
                    }}
                  >
                    You haven't added any trusted senders yet. Add one to get started.
                  </Text>
                )}

                {safeSenderEmails.length > 0 && (
                  <View style={{ gap: 10, marginBottom: 12 }}>
                    {safeSenderEmails.map((emailItem) => (
                      <View
                        key={emailItem.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 14,
                          borderRadius: 16,
                          backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                        }}
                      >
                        <Ionicons name="mail-outline" size={20} color={theme.primary} style={{ marginRight: 12 }} />
                        {editingSafeSenderId === emailItem.id ? (
                          <>
                            <TextInput
                              style={{ flex: 1, fontSize: 16, color: theme.foreground }}
                              value={editingSafeSenderEmail}
                              onChangeText={setEditingSafeSenderEmail}
                              keyboardType="email-address"
                              autoCapitalize="none"
                              autoCorrect={false}
                              autoFocus
                            />
                            <TouchableOpacity onPress={handleUpdateSafeSender} disabled={isSafeSenderUpdating}>
                              {isSafeSenderUpdating ? (
                                <ActivityIndicator size="small" color={theme.primary} />
                              ) : (
                                <Ionicons name="checkmark" size={24} color={theme.primary} />
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={cancelEditingSafeSender} disabled={isSafeSenderUpdating}>
                              <Ionicons name="close" size={24} color={theme.secondary} />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <Text style={{ flex: 1, fontSize: 16, color: theme.foreground }}>{emailItem.email_id}</Text>
                            <Pressable onPress={() => startEditingSafeSender(emailItem.id, emailItem.email_id)}>
                              <Ionicons name="pencil-outline" size={20} color={theme.secondary} />
                            </Pressable>
                            <Pressable onPress={() => deleteWhitelistedEmail(emailItem.id)} style={{ marginLeft: 12 }}>
                              <Ionicons name="trash-outline" size={20} color={theme.secondary} />
                            </Pressable>
                          </>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {showSafeSenderInput && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                      marginBottom: 16,
                      marginTop: safeSenderEmails.length > 0 ? 4 : 0,
                    }}
                  >
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 16,
                        color: theme.foreground,
                        paddingVertical: 4,
                      }}
                      value={newSafeSenderEmail}
                      onChangeText={setNewSafeSenderEmail}
                      placeholder={isDarkMode ? "Enter email address" : "jane@example.com"}
                      placeholderTextColor={theme.secondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus={isAddingSafeSender}
                    />
                    <TouchableOpacity
                      onPress={handleAddSafeSender}
                      disabled={isSafeSenderAdding}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: 8,
                      }}
                    >
                      {isSafeSenderAdding ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <Ionicons name="checkmark-circle" size={28} color={theme.primary} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={onSafeSenderCancel}
                      disabled={isSafeSenderAdding}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: 4,
                      }}
                    >
                      <Ionicons name="close-circle" size={28} color={theme.secondary} />
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => {
                    if (newSafeSenderEmail.trim()) {
                      handleAddSafeSender();
                    } else {
                      setIsAddingSafeSender(true);
                    }
                  }}
                  disabled={isSafeSenderPending}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    alignSelf: "flex-start",
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 100,
                    borderWidth: 1,
                    borderColor: isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
                    backgroundColor: "transparent",
                    gap: 8,
                    marginTop: 4,
                    opacity: isSafeSenderPending ? 0.5 : 1,
                  }}
                >
                  <Ionicons name="add" size={18} color={theme.foreground} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground }}>Add Senders</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* My Care Team — same member tiles as Dashboard `MyCareTeamSection` */}
        {!loadingCareTeam && careTeamMembers.length > 0 && (
          <>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "500",
                color: isDarkMode ? "#FFFFFF" : "#0D0F0F",
                lineHeight: 21.6,
                textTransform: "capitalize",
                marginBottom: 14,
                marginTop: 4,
              }}
            >
              My Care Team
            </Text>
            {careTeamMembers.map((member) => (
              <CareTeamMemberContactCard
                key={member.id}
                member={member}
                onPressCard={() => handleEditCareTeamMember(member)}
                headerAccessory={
                  isDarkMode ? (
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          member.vet_name || "Care team member",
                          undefined,
                          [
                            {
                              text: "Edit",
                              onPress: () => handleEditCareTeamMember(member),
                            },
                            {
                              text: "Remove",
                              style: "destructive",
                              onPress: () => handleRemoveCareTeamMember(member.id),
                            },
                            { text: "Cancel", style: "cancel" },
                          ]
                        );
                      }}
                      hitSlop={10}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={20} color={theme.secondary} />
                    </Pressable>
                  ) : undefined
                }
              />
            ))}
          </>
        )}

          <View style={{ marginBottom: 32 }}>
            <Text style={familySectionHeadingStyle}>Family Access</Text>

            <View style={familyAccessCardStyle}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <View style={familyIconWellStyle}>
                  <MaterialCommunityIcons
                    name="account-group-outline"
                    size={22}
                    color={isDarkMode ? "#FFFFFF" : "#1D2433"}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Invite family</Text>
                  <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 2 }}>
                    Share access to your pets with people you trust
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 15,
                  color: ui.title,
                  marginBottom: 6,
                }}
              >
                Invite by email
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins_400Regular",
                  fontSize: 13,
                  lineHeight: 19,
                  color: ui.muted,
                  marginBottom: 14,
                }}
              >
                Send a link to one pet. They sign in with the invited email to accept.
              </Text>

              {pets.length > 1 && (
                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      letterSpacing: 0.5,
                      color: theme.secondary,
                      marginBottom: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    Pet
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {pets.map((pet) => {
                      const selected = (effectiveInvitePetId ?? "") === pet.id;
                      return (
                        <Pressable
                          key={pet.id}
                          onPress={() => setInvitePetId(pet.id)}
                          style={selectChipStyle(selected)}
                        >
                          <Text
                            style={{
                              fontFamily: "Poppins_600SemiBold",
                              fontSize: 14,
                              color: selected ? theme.primaryForeground : theme.foreground,
                            }}
                          >
                            {pet.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                  color: theme.secondary,
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Email
              </Text>
              <TextInput
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="family@example.com"
                placeholderTextColor={theme.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  ...familyInputShellStyle,
                  fontSize: 16,
                  color: theme.foreground,
                  marginBottom: 14,
                }}
              />

              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                  color: theme.secondary,
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Access level
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
                {(
                  [
                    ["view_only", "View only"],
                    ["contributor", "Contributor"],
                    ["admin", "Admin"],
                  ] as const
                ).map(([value, label]) => {
                  const selected = inviteRole === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => setInviteRole(value)}
                      style={selectChipStyle(selected)}
                    >
                      <Text
                        style={{
                          fontFamily: "Poppins_600SemiBold",
                          fontSize: 14,
                          color: selected ? theme.primaryForeground : theme.foreground,
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <CTA
                label={sendingEmailInvite ? "Sending…" : "Send email invite"}
                onPress={handleSendEmailInvite}
                size="MD"
                style="Solid"
                disabled={sendingEmailInvite}
                leftIcon={
                  sendingEmailInvite ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
                  )
                }
              />

              <View
                style={{
                  height: 1,
                  backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  marginVertical: 18,
                }}
              />

              <Text
                style={{
                  fontFamily: "Poppins_400Regular",
                  fontSize: 13,
                  lineHeight: 19,
                  color: ui.muted,
                  marginBottom: 12,
                }}
              >
                Or share a household code (access to all your pets)
              </Text>
              <CTA
                label={generating ? "Generating…" : "Share code"}
                onPress={handleGenerateInvite}
                size="MD"
                style="Outline"
                disabled={generating}
                leftIcon={
                  generating ? (
                    <ActivityIndicator size="small" color={theme.foreground} />
                  ) : (
                    <MaterialCommunityIcons name="share-variant-outline" size={18} color={theme.foreground} />
                  )
                }
                containerStyle={{ alignSelf: "flex-start" }}
              />
            </View>

            {loadingMembers ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 8 }} />
            ) : (
              <>
                {(user || members.length > 0) && (
                  <Text
                    style={[
                      familySectionHeadingStyle,
                      { marginTop: 0, marginBottom: 12 },
                    ]}
                  >
                    Household members
                  </Text>
                )}

                {user && (
                  <View style={[familyNestedRowStyle, { marginBottom: 10 }]}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: theme.primary,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Poppins_600SemiBold",
                          fontSize: 14,
                          color: theme.primaryForeground,
                        }}
                      >
                        {ownerInitials}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          fontFamily: "Poppins_600SemiBold",
                          fontSize: 16,
                          color: theme.foreground,
                          marginBottom: 2,
                        }}
                      >
                        {ownerHero.displayName !== "Add your name" ? ownerHero.displayName : "You"}
                      </Text>
                      {user.email ? (
                        <Text style={{ fontSize: 13, color: theme.secondary }}>{user.email}</Text>
                      ) : null}
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 100,
                        backgroundColor: isDarkMode ? "rgba(18,186,183,0.2)" : "rgba(18,186,183,0.12)",
                        gap: 4,
                      }}
                    >
                      <MaterialCommunityIcons name="crown" size={12} color={theme.primary} />
                      <Text
                        style={{
                          fontFamily: "Poppins_600SemiBold",
                          fontSize: 12,
                          color: theme.primary,
                        }}
                      >
                        Owner
                      </Text>
                    </View>
                  </View>
                )}

                {members.map((member) => (
                  <View key={member.id} style={[familyNestedRowStyle, { marginBottom: 10 }]}>
                    <View style={[familyIconWellStyle, { width: 40, height: 40, borderRadius: 20, marginRight: 12 }]}>
                      <MaterialCommunityIcons
                        name="account-outline"
                        size={20}
                        color={isDarkMode ? "#FFFFFF" : "#1D2433"}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          fontFamily: "Poppins_600SemiBold",
                          fontSize: 16,
                          color: theme.foreground,
                          marginBottom: 2,
                        }}
                      >
                        Family member
                      </Text>
                      <Text style={{ fontSize: 13, color: theme.secondary }}>Household access</Text>
                    </View>
                    <Pressable onPress={() => handleRemoveMember(member.id)} hitSlop={8}>
                      <Ionicons name="close-circle" size={22} color="#FF3B30" />
                    </Pressable>
                  </View>
                ))}

                {members.length === 0 && !user && (
                  <Text
                    style={{
                      fontFamily: "Poppins_400Regular",
                      fontSize: 14,
                      color: ui.muted,
                    }}
                  >
                    No household members yet.
                  </Text>
                )}
              </>
            )}
          </View>
        </ScrollView>

        <Modal
          visible={!!showQRCode}
          transparent
          animationType="fade"
          onRequestClose={() => setShowQRCode(null)}
        >
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0, 0, 0, 0.9)",
            }}
          >
            <View
              style={{
                backgroundColor: isDarkMode ? theme.card : "#FFFFFF",
                borderRadius: 24,
                padding: 24,
                marginHorizontal: 16,
                maxWidth: 400,
                width: "90%",
                ...careTeamTileBorder,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View style={[familyIconWellStyle, { marginRight: 12 }]}>
                    <MaterialCommunityIcons
                      name="account-plus-outline"
                      size={22}
                      color={isDarkMode ? "#FFFFFF" : "#1D2433"}
                    />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 18,
                      color: theme.foreground,
                      flex: 1,
                    }}
                  >
                    Invite family member
                  </Text>
                </View>
                <Pressable onPress={() => setShowQRCode(null)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={theme.secondary} />
                </Pressable>
              </View>

              <Text
                style={{
                  fontFamily: "Poppins_400Regular",
                  fontSize: 13,
                  lineHeight: 19,
                  color: theme.secondary,
                  marginBottom: 20,
                }}
              >
                Share this household code so family members can join all of your pets in PawBuck
              </Text>

              {showQRCode && (
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <View
                    style={{
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 16,
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    <QRCode value={showQRCode} size={200} color="#000000" backgroundColor="#FFFFFF" />
                  </View>

                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      letterSpacing: 0.5,
                      color: theme.secondary,
                      marginBottom: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    Or share this code
                  </Text>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        fontSize: 20,
                        color: theme.primary,
                      }}
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
                      hitSlop={8}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isDarkMode ? "rgba(18,186,183,0.2)" : "rgba(18,186,183,0.12)",
                        }}
                      >
                        <Ionicons name="copy-outline" size={18} color={theme.primary} />
                      </View>
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={[familyNestedRowStyle, { marginBottom: 0 }]}>
                <Text
                  style={{
                    fontFamily: "Poppins_400Regular",
                    fontSize: 13,
                    lineHeight: 19,
                    color: theme.secondary,
                    flex: 1,
                  }}
                >
                  Family members can enter this code when they select &apos;Track My Household Pet&apos; during sign up
                </Text>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add/Edit Care Team Member Modal */}
        {pets.length > 0 && (
          <CareTeamMemberModal
            visible={showAddMemberModal}
            onClose={() => {
              setShowAddMemberModal(false);
              setSelectedMember(null);
            }}
            onSave={handleSaveCareTeamMember}
            onDelete={selectedMember ? handleDeleteCareTeamMember : undefined}
            memberInfo={selectedMember}
            memberType={selectedMemberType}
            onTypeChange={setSelectedMemberType}
            allPets={pets}
            petId={pets[0].id} // Required prop, but we'll link to all pets when adding
          />
        )}

        {/* Care team added — success dialog (Figma) */}
        <Modal
          visible={careTeamAddedSuccessVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCareTeamAddedSuccessVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.45)",
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 28,
            }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: 340,
                backgroundColor: isDarkMode ? theme.card : "#FFFFFF",
                borderRadius: 20,
                paddingHorizontal: 24,
                paddingTop: 28,
                paddingBottom: 20,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 24,
                elevation: 8,
              }}
            >
              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: isDarkMode ? "rgba(46, 125, 50, 0.25)" : "#E8F5E9",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="checkmark-circle" size={36} color={isDarkMode ? "#81C784" : "#2E7D32"} />
                </View>
              </View>
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 20,
                  color: isDarkMode ? theme.foreground : "#111111",
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                Care Team Added
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins_400Regular",
                  fontSize: 15,
                  lineHeight: 22,
                  color: isDarkMode ? theme.secondary : "#757575",
                  textAlign: "center",
                  marginBottom: 24,
                }}
              >
                Care team member added to your pet's profile successfully.
              </Text>
              <Pressable
                onPress={() => setCareTeamAddedSuccessVisible(false)}
                style={({ pressed }) => ({
                  width: "100%",
                  paddingVertical: 14,
                  borderRadius: 100,
                  backgroundColor: isDarkMode ? theme.border : "#DDE1E5",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 16,
                    color: isDarkMode ? theme.foreground : "#111111",
                  }}
                >
                  OK
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Bottom Navigation */}
        <BottomNavBar activeTab="profile" />
      </View>
  );
}
