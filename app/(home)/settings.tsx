import BottomNavBar from "@/components/home/BottomNavBar";
import { CareTeamMemberModal } from "@/components/home/CareTeamMemberModal";
import MyCareTeamSection from "@/components/home/MyCareTeamSection";
import { PetEditModal } from "@/components/home/PetEditModal";
import PetImage from "@/components/home/PetImage";
import PetSelector from "@/components/home/PetSelector";
import { TransferOwnershipModal } from "@/components/home/TransferOwnershipModal";
import { TransferQRCodeModal } from "@/components/home/TransferQRCodeModal";
import PetInformationCard from "@/components/profile/PetInformationCard";
import { useAuth } from "@/context/authContext";
import { ChatProvider } from "@/context/chatContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { TablesInsert, TablesUpdate } from "@/database.types";
import {
  getCareTeamMembersForPet,
  linkCareTeamMemberToPet,
  unlinkCareTeamMemberFromPet,
} from "@/services/careTeamMembers";
import { generateAndSharePetPassport } from "@/services/pdfGenerator";
import { addEmail } from "@/services/petEmailList";
import { deletePet, linkVetToPet } from "@/services/pets";
import { getUserProfile, updateUserProfile, UserProfile } from "@/services/userProfile";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import {
  CareTeamMemberType,
  createVetInformation,
  deleteVetInformation,
  getVetInformation,
  updateVetInformation,
  VetInformation,
} from "@/services/vetInformation";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function Settings() {
  const router = useRouter();
  const { theme, mode, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { pets, updatePet, deletePet: deletePetFromContext, updatingPet, deletingPet } = usePets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ petId?: string }>();

  const [showDeletePetModal, setShowDeletePetModal] = useState(false);
  const [selectedPetForDelete, setSelectedPetForDelete] = useState<string | null>(null);
  const [showPetEditModal, setShowPetEditModal] = useState(false);
  const [showOwnerEditModal, setShowOwnerEditModal] = useState(false);
  const [showCareTeamModal, setShowCareTeamModal] = useState(false);
  const [selectedMemberType, setSelectedMemberType] = useState<CareTeamMemberType>("veterinarian");
  const [selectedMember, setSelectedMember] = useState<VetInformation | null>(null);
  const [editingPhone, setEditingPhone] = useState("");
  const [editingAddress, setEditingAddress] = useState("");
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showTransferOwnershipModal, setShowTransferOwnershipModal] = useState(false);
  const [showTransferQRCodeModal, setShowTransferQRCodeModal] = useState(false);

  // Add state for selected pet ID (use URL param as initial value, or first pet if available)
  const [selectedPetId, setSelectedPetId] = useState<string | null>(
    params.petId || (pets.length > 0 ? pets[0].id : null)
  );

  // Update selectedPet to use state instead of just params
  const selectedPet = selectedPetId ? pets.find(p => p.id === selectedPetId) : null;

  // Add handler for pet selection
  const handleSelectPet = (petId: string) => {
    setSelectedPetId(petId);
    router.setParams({ petId });
  };

  // Sync selectedPetId with URL params when they change externally
  useEffect(() => {
    if (params.petId) {
      setSelectedPetId(params.petId);
    }
  }, [params.petId]);

  // Fetch user profile for display
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["user_profile"],
    queryFn: getUserProfile,
    enabled: !!user,
  });

  // Fetch vet information for selected pet
  const { data: vetInfo } = useQuery({
    queryKey: ["vet_information", selectedPet?.vet_information_id],
    queryFn: () => getVetInformation(selectedPet!.vet_information_id!),
    enabled: !!selectedPet?.vet_information_id,
  });

  // Fetch care team members for selected pet
  const { data: careTeamMembers = [] } = useQuery({
    queryKey: ["care_team_members", selectedPet?.id],
    queryFn: () => getCareTeamMembersForPet(selectedPet!.id),
    enabled: !!selectedPet?.id,
  });

  // Fetch vaccinations for selected pet (for passport generation)
  const { data: vaccinations = [] } = useQuery({
    queryKey: ["vaccinations", selectedPet?.id],
    queryFn: () => getVaccinationsByPetId(selectedPet!.id),
    enabled: !!selectedPet?.id,
  });

  // Delete pet mutation
  const deletePetMutation = useMutation({
    mutationFn: deletePet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      setShowDeletePetModal(false);
      setSelectedPetForDelete(null);
      Alert.alert("Success", "Pet deleted successfully");
    },
    onError: (error) => {
      Alert.alert("Error", "Failed to delete pet");
      console.error("Error deleting pet:", error);
    },
  });



  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/");
          } catch (error: any) {
            console.error("Error signing out:", error);
            Alert.alert("Error", error.message || "Failed to sign out");
          }
        },
      },
    ]);
  };

  const handleDeletePet = (petId: string) => {
    const pet = pets.find((p) => p.id === petId);
    Alert.alert(
      "Delete Pet",
      `Are you sure you want to delete ${pet?.name}? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deletePetMutation.mutate(petId);
          },
        },
      ]
    );
  };

  const handleUpdatePet = async (petId: string, petData: TablesUpdate<"pets">) => {
    await updatePet(petId, petData);
  };

  const handleDownloadPassport = async () => {
    if (!selectedPet) return;
    
    setGeneratingPDF(true);
    try {
      await generateAndSharePetPassport({
        pet: selectedPet,
        vaccinations: vaccinations || [],
      });
    } catch (error) {
      console.error("Error generating passport:", error);
      Alert.alert("Error", "Failed to generate pet passport. Please try again.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDeletePetFromModal = async (petId: string) => {
    await deletePetFromContext(petId);
    // Navigate back to home if pet was deleted
    router.back();
  };

  const handleTransferOwnership = () => {
    if (selectedPet) {
      setShowTransferOwnershipModal(true);
    }
  };

  const handleGenerateQRCode = () => {
    setShowTransferOwnershipModal(false);
    setShowTransferQRCodeModal(true);
  };

  // Mutations for vet information
  const createVetMutation = useMutation({
    mutationFn: async (vetData: TablesInsert<"vet_information">) => {
      const newVet = await createVetInformation(vetData);
      await linkVetToPet(selectedPet!.id, newVet.id);
      return newVet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPet?.id] });
      queryClient.invalidateQueries({ queryKey: ["vet_information"] });
    },
  });

  const updateVetMutation = useMutation({
    mutationFn: async (vetData: TablesUpdate<"vet_information">) => {
      if (!selectedPet?.vet_information_id) throw new Error("No vet info to update");
      return updateVetInformation(selectedPet.vet_information_id, vetData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPet?.id] });
      queryClient.invalidateQueries({ queryKey: ["vet_information"] });
    },
  });

  const deleteVetMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPet?.vet_information_id) throw new Error("No vet info to delete");
      await deleteVetInformation(selectedPet.vet_information_id);
      await linkVetToPet(selectedPet.id, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPet?.id] });
    },
  });

  // Mutations for care team members (non-veterinarian)
  const createCareTeamMemberMutation = useMutation({
    mutationFn: async (memberData: TablesInsert<"vet_information">) => {
      const newMember = await createVetInformation(memberData);
      await linkCareTeamMemberToPet(selectedPet!.id, newMember.id);
      return newMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPet?.id] });
    },
  });

  const updateCareTeamMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TablesUpdate<"vet_information"> }) => {
      return updateVetInformation(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPet?.id] });
      queryClient.invalidateQueries({ queryKey: ["vet_information"] });
    },
  });

  const deleteCareTeamMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await unlinkCareTeamMemberFromPet(selectedPet!.id, memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPet?.id] });
    },
  });

  // Update owner profile mutation
  const updateOwnerMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_profile"] });
      queryClient.invalidateQueries({ queryKey: ["user_preferences"] });
      setShowOwnerEditModal(false);
      Alert.alert("Success", "Profile updated successfully");
    },
    onError: (error) => {
      Alert.alert("Error", "Failed to update profile");
      console.error("Error updating profile:", error);
    },
  });

  // Handlers
  const handleEditOwner = () => {
    if (userProfile) {
      setEditingPhone(userProfile.phone || "");
      setEditingAddress(userProfile.address || "");
      setShowOwnerEditModal(true);
    }
  };

  const handleSaveOwner = () => {
    updateOwnerMutation.mutate({
      phone: editingPhone.trim() || null,
      address: editingAddress.trim() || null,
    });
  };

  const handleSaveVetInfo = async (
    vetData: TablesInsert<"vet_information"> | TablesUpdate<"vet_information">
  ) => {
    if (selectedPet?.vet_information_id && vetInfo) {
      await updateVetMutation.mutateAsync(vetData as TablesUpdate<"vet_information">);
      // Automatically whitelist the email when updating a vet
      if (selectedPet && vetData.email) {
        try {
          await addEmail(selectedPet.id, vetData.email, false); // false = whitelisted
          // Invalidate whitelisted emails query to refresh the UI
          queryClient.invalidateQueries({ queryKey: ["whitelisted_emails", selectedPet.id] });
        } catch (emailError) {
          // Log error but don't fail the entire operation if email whitelisting fails
          console.error("Error whitelisting email:", emailError);
        }
      }
    } else {
      await createVetMutation.mutateAsync(vetData as TablesInsert<"vet_information">);
      // Automatically whitelist the email when adding a new vet
      if (selectedPet && vetData.email) {
        try {
          await addEmail(selectedPet.id, vetData.email, false); // false = whitelisted
          // Invalidate whitelisted emails query to refresh the UI
          queryClient.invalidateQueries({ queryKey: ["whitelisted_emails", selectedPet.id] });
        } catch (emailError) {
          // Log error but don't fail the entire operation if email whitelisting fails
          console.error("Error whitelisting email:", emailError);
        }
      }
    }
  };

  const handleDeleteVetInfo = async () => {
    await deleteVetMutation.mutateAsync();
  };

  const handleAddCareTeamMember = (type: CareTeamMemberType) => {
    setSelectedMemberType(type);
    setSelectedMember(null);
    setShowCareTeamModal(true);
  };

  const handleEditCareTeamMember = (member: VetInformation) => {
    setSelectedMember(member);
    setSelectedMemberType(((member as any).type as CareTeamMemberType) || "veterinarian");
    setShowCareTeamModal(true);
  };

  const handleSaveCareTeamMember = async (
    memberData: TablesInsert<"vet_information"> | TablesUpdate<"vet_information">
  ) => {
    if (!selectedPet) return;
    try {
      if (selectedMember) {
        await updateCareTeamMemberMutation.mutateAsync({
          id: selectedMember.id,
          data: memberData as TablesUpdate<"vet_information">,
        });
        // Automatically whitelist the email when updating a care team member
        if (memberData.email) {
          try {
            await addEmail(selectedPet.id, memberData.email, false); // false = whitelisted
            // Invalidate whitelisted emails query to refresh the UI
            queryClient.invalidateQueries({ queryKey: ["whitelisted_emails", selectedPet.id] });
          } catch (emailError) {
            // Log error but don't fail the entire operation if email whitelisting fails
            console.error("Error whitelisting email:", emailError);
          }
        }
      } else {
        await createCareTeamMemberMutation.mutateAsync(memberData as TablesInsert<"vet_information">);
        // Automatically whitelist the email when adding a new care team member
        if (memberData.email) {
          try {
            await addEmail(selectedPet.id, memberData.email, false); // false = whitelisted
            // Invalidate whitelisted emails query to refresh the UI
            queryClient.invalidateQueries({ queryKey: ["whitelisted_emails", selectedPet.id] });
          } catch (emailError) {
            // Log error but don't fail the entire operation if email whitelisting fails
            console.error("Error whitelisting email:", emailError);
          }
        }
      }
      setShowCareTeamModal(false);
      setSelectedMember(null);
    } catch (error) {
      console.error("Error saving care team member:", error);
    }
  };

  const handleDeleteCareTeamMember = async (memberId: string) => {
    await deleteCareTeamMemberMutation.mutateAsync(memberId);
  };

  return (
    <ChatProvider>
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* Header */}
      <View className="pt-12 pb-6 px-6">
        <View className="flex-row justify-between items-center">
          {/* Logo */}
          <Image
            source={require("@/assets/images/icon.png")}
            style={{ width: 44, height: 44 }}
            resizeMode="contain"
          />

          {/* Theme Toggle */}
          <TouchableOpacity
            onPress={toggleTheme}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.card }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={mode === "dark" ? "moon" : "sunny"}
              size={20}
              color={theme.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Pet Selector */}
        {pets.length > 0 && (
          <View className="mb-6">
            <PetSelector
              pets={pets}
              selectedPetId={selectedPetId}
              onSelectPet={handleSelectPet}
            />
          </View>
        )}

        {/* Pet Information Section - Only show if petId is provided */}
        {selectedPet && (
          <View className="mb-6">
            {/* Pet Profile Image */}
            <View className="mb-6">
              <PetImage pet={selectedPet} style="hero" />
            </View>

            {/* Pet Name & Email */}
            <View className="mb-6 items-center">
              <Text
                className="text-3xl font-bold mb-2"
                style={{ color: theme.foreground }}
              >
                {selectedPet.name}
              </Text>
              <Text
                className="text-base"
                style={{ color: theme.secondary }}
              >
                {selectedPet.email_id}@pawbuck.app
              </Text>
            </View>

            {/* Download Pet Passport Button */}
            <TouchableOpacity
              onPress={handleDownloadPassport}
              disabled={generatingPDF}
              className="mb-6 rounded-2xl p-4 flex-row items-center"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              activeOpacity={0.7}
            >
              <View
                className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                style={{ backgroundColor: theme.primary }}
              >
                <Ionicons name="download-outline" size={24} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold" style={{ color: theme.foreground }}>
                  Download Pet Passport
                </Text>
                <Text className="text-sm mt-0.5" style={{ color: theme.secondary }}>
                  PDF format with all details
                </Text>
              </View>
              {generatingPDF ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
              )}
            </TouchableOpacity>

            <View
              className="rounded-2xl p-4"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text
                  className="text-xl font-bold"
                  style={{ color: theme.foreground }}
                >
                  Pet Information
                </Text>
                <TouchableOpacity onPress={() => setShowPetEditModal(true)}>
                  <Ionicons name="pencil-outline" size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>
              
              {/* Animal Type */}
              <View className="flex-row items-center justify-between py-3 border-b" style={{ borderBottomColor: theme.border + "40" }}>
                <View className="flex-row items-center flex-1">
                  <Ionicons name="paw-outline" size={20} color={theme.primary} style={{ marginRight: 12 }} />
                  <View className="flex-1">
                    <Text className="text-sm" style={{ color: theme.secondary }}>
                      Animal Type
                    </Text>
                    <Text className="text-base font-medium mt-0.5" style={{ color: theme.foreground }}>
                      {selectedPet.animal_type.charAt(0).toUpperCase() + selectedPet.animal_type.slice(1)}
                    </Text>
                  </View>
                </View>
                <View
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: theme.border + "40" }}
                >
                  <Text className="text-xs" style={{ color: theme.secondary }}>
                    Locked
                  </Text>
                </View>
              </View>

              {/* Breed */}
              <View className="flex-row items-center justify-between py-3 border-b" style={{ borderBottomColor: theme.border + "40" }}>
                <View className="flex-row items-center flex-1">
                  <Ionicons name="paw-outline" size={20} color={theme.primary} style={{ marginRight: 12 }} />
                  <View className="flex-1">
                    <Text className="text-sm" style={{ color: theme.secondary }}>
                      Breed
                    </Text>
                    <Text className="text-base font-medium mt-0.5" style={{ color: theme.foreground }}>
                      {selectedPet.breed}
                    </Text>
                  </View>
                </View>
                <View
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: theme.border + "40" }}
                >
                  <Text className="text-xs" style={{ color: theme.secondary }}>
                    Locked
                  </Text>
                </View>
              </View>

              {/* Pet Details - integrated from PetInformationCard */}
              <PetInformationCard pet={selectedPet} onEdit={() => setShowPetEditModal(true)} />
            </View>
          </View>
        )}

        {/* Pet Owner Information Section */}
        <View
          className="rounded-2xl mb-6"
          style={{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <View className="flex-row items-center justify-between p-4 border-b" style={{ borderBottomColor: theme.border + "40" }}>
            <Text
              className="text-xl font-bold"
              style={{ color: theme.foreground }}
            >
              Pet Owner
            </Text>
            <TouchableOpacity onPress={handleEditOwner}>
              <Ionicons name="pencil-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <View className="flex-row items-center justify-between py-3 px-4 border-b" style={{ borderBottomColor: theme.border + "40" }}>
            <View className="flex-row items-center flex-1">
              <Ionicons name="person-outline" size={20} color={theme.primary} style={{ marginRight: 12 }} />
              <View className="flex-1">
                <Text className="text-sm" style={{ color: theme.secondary }}>
                  Name
                </Text>
                <Text className="text-base font-medium mt-0.5" style={{ color: theme.foreground }}>
                  {userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Not set"}
                </Text>
              </View>
            </View>
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: theme.border + "40" }}
            >
              <Text className="text-xs" style={{ color: theme.secondary }}>
                Locked
              </Text>
            </View>
          </View>

          {/* Email */}
          <View className="flex-row items-center justify-between py-3 px-4 border-b" style={{ borderBottomColor: theme.border + "40" }}>
            <View className="flex-row items-center flex-1">
              <Ionicons name="mail-outline" size={20} color={theme.primary} style={{ marginRight: 12 }} />
              <View className="flex-1">
                <Text className="text-sm" style={{ color: theme.secondary }}>
                  Email
                </Text>
                <Text className="text-base font-medium mt-0.5" style={{ color: theme.foreground }}>
                  {userProfile?.email || user?.email || "Not set"}
                </Text>
              </View>
            </View>
          </View>

          {/* Phone */}
          <View className="flex-row items-center justify-between py-3 px-4 border-b" style={{ borderBottomColor: theme.border + "40" }}>
            <View className="flex-row items-center flex-1">
              <Ionicons name="call-outline" size={20} color={theme.primary} style={{ marginRight: 12 }} />
              <View className="flex-1">
                <Text className="text-sm" style={{ color: theme.secondary }}>
                  Phone
                </Text>
                <Text className="text-base font-medium mt-0.5" style={{ color: theme.foreground }}>
                  {userProfile?.phone || "Not set"}
                </Text>
              </View>
            </View>
          </View>

          {/* Address */}
          <View className="flex-row items-center justify-between py-3 px-4">
            <View className="flex-row items-center flex-1">
              <Ionicons name="location-outline" size={20} color={theme.primary} style={{ marginRight: 12 }} />
              <View className="flex-1">
                <Text className="text-sm" style={{ color: theme.secondary }}>
                  Address
                </Text>
                <Text className="text-base font-medium mt-0.5" style={{ color: theme.foreground }}>
                  {userProfile?.address || "Not set"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pet Providers (Care Team) Section - Only show if petId is provided */}
        {selectedPet && (
          <View className="mb-6">
            <MyCareTeamSection
              vetInfo={vetInfo || null}
              careTeamMembers={careTeamMembers}
              onAddMember={handleAddCareTeamMember}
              onEditMember={handleEditCareTeamMember}
              petId={selectedPet.id}
            />
          </View>
        )}

        {/* Transfer Ownership Card */}
        {pets.length > 0 && (
          <TouchableOpacity
            onPress={handleTransferOwnership}
            className="rounded-3xl p-6 mb-6 flex-row items-center justify-between"
                style={{
              backgroundColor: theme.card,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View
                className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                style={{ backgroundColor: "#FFD70020" }}
              >
                <Ionicons
                  name="person-add-outline"
                  size={24}
                  color="#FFD700"
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-lg font-semibold"
                  style={{ color: theme.foreground }}
                >
                  Transfer Ownership
                </Text>
                <Text className="text-sm mt-0.5" style={{ color: theme.secondary }}>
                  Transfer {selectedPet?.name || "pet"} to a new owner
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </TouchableOpacity>
        )}

        {/* Delete Pet Button */}
        {pets.length > 0 && (
          <TouchableOpacity
            onPress={() => handleDeletePet(pets[0].id)}
            disabled={deletePetMutation.isPending}
            className="rounded-2xl py-4 flex-row items-center justify-center mb-6"
            style={{
              backgroundColor: "transparent",
              borderWidth: 2,
              borderColor: theme.error,
            }}
            activeOpacity={0.7}
          >
            {deletePetMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={theme.error} />
                <Text
                  className="text-base font-semibold ml-2"
                  style={{ color: theme.error }}
                >
                  Delete Pet
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Log Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="rounded-2xl py-4 flex-row items-center justify-center mb-6"
          style={{
            backgroundColor: "transparent",
            borderWidth: 2,
            borderColor: theme.error,
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.error} />
          <Text
            className="text-base font-semibold ml-2"
            style={{ color: theme.error }}
          >
            Log Out
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Pet Edit Modal */}
      {showPetEditModal && selectedPet && (
        <PetEditModal
          visible={showPetEditModal}
          onClose={() => setShowPetEditModal(false)}
          onSave={handleUpdatePet}
          onDelete={handleDeletePetFromModal}
          pet={selectedPet}
          loading={updatingPet}
          deleting={deletingPet}
        />
      )}

      {/* Pet Owner Edit Modal */}
      <Modal
        visible={showOwnerEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOwnerEditModal(false)}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ backgroundColor: theme.background }}
        >
          <View
            className="px-6 pt-4 pb-4 border-b"
            style={{
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
            }}
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => setShowOwnerEditModal(false)}
                disabled={updateOwnerMutation.isPending}
              >
                <Text className="text-base" style={{ color: theme.primary }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text
                className="text-lg font-semibold"
                style={{ color: theme.foreground }}
              >
                Edit Pet Owner
              </Text>
              <TouchableOpacity
                onPress={handleSaveOwner}
                disabled={updateOwnerMutation.isPending}
              >
                <Text
                  className="text-base font-semibold"
                  style={{
                    color: updateOwnerMutation.isPending ? theme.secondary : theme.primary,
                  }}
                >
                  {updateOwnerMutation.isPending ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
            <View className="mb-4">
              <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
                Phone Number
              </Text>
              <TextInput
                className="w-full rounded-xl py-4 px-4 text-base"
                style={{
                  backgroundColor: theme.card,
                  color: theme.foreground,
                  borderColor: theme.border,
                  borderWidth: 1,
                }}
                value={editingPhone}
                onChangeText={setEditingPhone}
                placeholder="e.g., +1 (555) 123-4567"
                placeholderTextColor={theme.secondary}
                keyboardType="phone-pad"
                editable={!updateOwnerMutation.isPending}
              />
            </View>

            <View className="mb-6">
              <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
                Address
              </Text>
              <TextInput
                className="w-full rounded-xl py-4 px-4 text-base"
                style={{
                  backgroundColor: theme.card,
                  color: theme.foreground,
                  borderColor: theme.border,
                  borderWidth: 1,
                }}
                value={editingAddress}
                onChangeText={setEditingAddress}
                placeholder="e.g., 123 Pet Lane, San Francisco, CA 94102"
                placeholderTextColor={theme.secondary}
                editable={!updateOwnerMutation.isPending}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Care Team Member Modal */}
      {showCareTeamModal && selectedPet && (
        <CareTeamMemberModal
          visible={showCareTeamModal}
          onClose={() => {
            setShowCareTeamModal(false);
            setSelectedMember(null);
          }}
          onSave={handleSaveCareTeamMember}
          onDelete={selectedMember ? async () => {
            await handleDeleteCareTeamMember(selectedMember.id);
            setShowCareTeamModal(false);
            setSelectedMember(null);
          } : undefined}
          memberInfo={selectedMember}
          memberType={selectedMemberType}
          petId={selectedPet.id}
          loading={
            createCareTeamMemberMutation.isPending ||
            updateCareTeamMemberMutation.isPending ||
            deleteCareTeamMemberMutation.isPending
          }
        />
      )}

      {/* Transfer Ownership Modal */}
      {showTransferOwnershipModal && selectedPet && (
        <TransferOwnershipModal
          visible={showTransferOwnershipModal}
          onClose={() => setShowTransferOwnershipModal(false)}
          pet={selectedPet}
          onGenerateQRCode={handleGenerateQRCode}
        />
      )}

      {/* Transfer QR Code Modal */}
      {showTransferQRCodeModal && selectedPet && (
        <TransferQRCodeModal
          visible={showTransferQRCodeModal}
          onClose={() => setShowTransferQRCodeModal(false)}
          pet={selectedPet}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavBar activeTab="profile" />
    </View>
    </ChatProvider>
  );
}



