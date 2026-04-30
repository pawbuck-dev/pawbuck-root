import BottomNavBar from "@/components/home/BottomNavBar";
import { CareTeamEmptyStateCard } from "@/components/home/CareTeamEmptyStateCard";
import { CareTeamMemberContactCard } from "@/components/home/CareTeamMemberContactCard";
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
import {
  CareTeamMemberType,
  createVetInformation,
  findExistingCareTeamMember,
  getAllCareTeamMembers,
  updateVetInformation,
  VetInformation,
} from "@/services/vetInformation";
import { supabase } from "@/utils/supabase";
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
  const { ensurePremium } = useSubscription();
  const queryClient = useQueryClient();
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
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
    ensurePremium(() => {
      setGenerating(true);
      createInviteMutation.mutate(30);
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

  return (
    <View className="flex-1" style={{ backgroundColor: ui.pageBg }}>
      {/* Header — centered title, circular back (light ref) */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 16,
          paddingHorizontal: 20,
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[
            {
              position: "absolute",
              left: 20,
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: ui.backFab,
              borderWidth: isDarkMode ? 0 : 1,
              borderColor: isDarkMode ? "transparent" : "#E8E8E8",
            },
            !isDarkMode && {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={ui.title} />
        </Pressable>
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            fontSize: 18,
            color: ui.title,
          }}
        >
          Care Team
        </Text>
      </View>

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

          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <MaterialCommunityIcons name="account-group-outline" size={24} color={theme.foreground} style={{ marginRight: 12 }} />
                <Text className="text-xl font-bold flex-1" style={{ color: theme.foreground }}>
                  Family Access
                </Text>
              </View>
              <Pressable
                onPress={handleGenerateInvite}
                disabled={generating}
                className="px-4 py-2 rounded-lg active:opacity-70"
                style={{ backgroundColor: isDarkMode ? "#374151" : theme.border }}
              >
                {generating ? (
                  <ActivityIndicator size="small" color={theme.foreground} />
                ) : (
                  <Text className="text-base font-semibold" style={{ color: theme.foreground }}>
                    Invite
                  </Text>
                )}
              </Pressable>
            </View>

            {loadingMembers ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                {user && (
                  <View
                    className="rounded-2xl p-4 mb-3 flex-row items-center justify-between"
                    style={{ backgroundColor: theme.card }}
                  >
                    <View className="flex-row items-center flex-1">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <Text className="text-base font-semibold" style={{ color: theme.primaryForeground }}>
                          {getInitials(user.email || "User")}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-semibold mb-1" style={{ color: theme.foreground }}>
                          {user.email?.split("@")[0] || "You"}
                        </Text>
                        <Text className="text-sm" style={{ color: theme.secondary }}>
                          {user.email || ""}
                        </Text>
                      </View>
                      <View
                        className="px-3 py-1 rounded-full flex-row items-center"
                        style={{ backgroundColor: "#A855F7" }}
                      >
                        <MaterialCommunityIcons name="crown" size={12} color={theme.primaryForeground} style={{ marginRight: 4 }} />
                        <Text className="text-xs font-semibold" style={{ color: theme.primaryForeground }}>
                          Owner
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {members.map((member) => (
                  <View
                    key={member.id}
                    className="rounded-2xl p-4 mb-3 flex-row items-center justify-between"
                    style={{ backgroundColor: theme.card }}
                  >
                    <View className="flex-row items-center flex-1">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <Text className="text-base font-semibold" style={{ color: theme.primaryForeground }}>
                          {getInitials(member.user_id)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-semibold mb-1" style={{ color: theme.foreground }}>
                          {member.user_id.split("@")[0] || member.user_id}
                        </Text>
                        <Text className="text-sm" style={{ color: theme.secondary }}>
                          {member.user_id}
                        </Text>
                      </View>
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
              style={{ backgroundColor: theme.card, maxWidth: 400, width: "90%" }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center flex-1">
                  <Ionicons name="person-add" size={24} color={theme.foreground} style={{ marginRight: 8 }} />
                  <Text
                    className="text-xl font-bold flex-1"
                    style={{ color: theme.foreground }}
                  >
                    Invite Family Member
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowQRCode(null)}
                  className="active:opacity-70"
                >
                  <Ionicons name="close" size={24} color={theme.secondary} />
                </Pressable>
              </View>

              <Text
                className="text-sm mb-6"
                style={{ color: theme.secondary }}
              >
                Share this code with family members so they can track your pets
              </Text>

              {showQRCode && (
                <View className="items-center mb-6">
                  <View
                    className="rounded-xl p-4 mb-4"
                    style={{ backgroundColor: "#FFFFFF" }}
                  >
                    <QRCode value={showQRCode} size={200} color="#000000" backgroundColor="#FFFFFF" />
                  </View>

                  <Text
                    className="text-sm mb-3"
                    style={{ color: theme.secondary }}
                  >
                    Or share this code:
                  </Text>

                  <View className="flex-row items-center gap-3">
                    <Text
                      className="text-xl font-bold"
                      style={{ color: theme.primary }}
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
                        style={{ backgroundColor: `${theme.primary}33` }}
                      >
                        <Ionicons name="copy-outline" size={18} color={theme.primary} />
                      </View>
                    </Pressable>
                  </View>
                </View>
              )}

              <View
                className="rounded-xl p-4 mb-4"
                style={{ backgroundColor: isDarkMode ? "#374151" : theme.border }}
              >
                <Text
                  className="text-sm"
                  style={{ color: theme.secondary }}
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
