import { AnimatedParticles } from "@/components/animations/AnimatedParticles";
import BottomNavBar from "@/components/home/BottomNavBar";
import {
  CareTeamMemberModal,
  CareTeamMemberSaveData,
} from "@/components/home/CareTeamMemberModal";
import DailyIntakeSection from "@/components/home/DailyIntakeSection";
import DailyWellnessSection from "@/components/home/DailyWellnessSection";
import HealthRecordsSection from "@/components/home/HealthRecordsSection";
import HomeHeader from "@/components/home/HomeHeader";
import MyCareTeamSection from "@/components/home/MyCareTeamSection";
import PetImage from "@/components/home/PetImage";
import PetSelector from "@/components/home/PetSelector";
import TodaysMedicationsSection from "@/components/home/TodaysMedicationsSection";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { TablesInsert, TablesUpdate } from "@/database.types";
import {
  getCareTeamMembersForPet,
  linkCareTeamMemberToAllUserPets,
  unlinkCareTeamMemberFromPet,
} from "@/services/careTeamMembers";
import { fetchMedicines } from "@/services/medicines";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import {
  CareTeamMemberType,
  createVetInformation,
  findExistingCareTeamMember,
  updateVetInformation,
  VetInformation,
} from "@/services/vetInformation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

export default function Home() {
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  const router = useRouter();
  const {
    pets,
    loadingPets,
    addingPet,
    updatePet,
    updatingPet,
    deletePet,
    deletingPet,
  } = usePets();
  const { selectedPetId, selectedPet, setSelectedPetId } = useSelectedPet();
  const { refreshPendingApprovals, pendingApprovals } = useEmailApproval();
  const queryClient = useQueryClient();

  // State
  const [emailCopied, setEmailCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showVetModal, setShowVetModal] = useState(false);
  const [showCareTeamModal, setShowCareTeamModal] = useState(false);
  const [selectedMemberType, setSelectedMemberType] =
    useState<CareTeamMemberType>("veterinarian");
  const [selectedMember, setSelectedMember] = useState<VetInformation | null>(
    null
  );

  // Compute notification counts per pet from pending approvals
  const notificationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pendingApprovals.forEach((approval) => {
      counts[approval.pet_id] = (counts[approval.pet_id] || 0) + 1;
    });
    return counts;
  }, [pendingApprovals]);

  // Fetch vaccinations for selected pet
  const { data: vaccinations = [] } = useQuery({
    queryKey: ["vaccinations", selectedPetId],
    queryFn: () => getVaccinationsByPetId(selectedPetId!),
    enabled: !!selectedPetId,
  });

  // Fetch medications for selected pet
  const { data: medicines = [] } = useQuery({
    queryKey: ["medicines", selectedPetId],
    queryFn: () => fetchMedicines(selectedPetId!),
    enabled: !!selectedPetId,
  });

  // Fetch care team members for the selected pet
  const { data: careTeamMembers = [] } = useQuery({
    queryKey: ["care_team_members", selectedPetId],
    queryFn: () => getCareTeamMembersForPet(selectedPetId!),
    enabled: !!selectedPetId,
  });

  // Mutations for care team members
  const createCareTeamMemberMutation = useMutation({
    mutationFn: async ({
      memberData,
    }: {
      memberData: TablesInsert<"vet_information">;
    }) => {
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
        // Create new record
        const newMember = await createVetInformation(memberData);
        careTeamMemberId = newMember.id;
      }

      // Link to all user pets
      const petIds = await linkCareTeamMemberToAllUserPets(careTeamMemberId);

      return { careTeamMemberId, petIds };
    },
    onSuccess: (result) => {
      // Invalidate care team members for all affected pets
      result.petIds.forEach((petId) => {
        queryClient.invalidateQueries({
          queryKey: ["care_team_members", petId],
        });
      });
    },
  });

  const updateCareTeamMemberMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: TablesUpdate<"vet_information">;
    }) => {
      return updateVetInformation(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["care_team_members", selectedPetId],
      });
      queryClient.invalidateQueries({ queryKey: ["vet_information"] });
    },
  });

  const deleteCareTeamMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await unlinkCareTeamMemberFromPet(selectedPetId!, memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["care_team_members", selectedPetId],
      });
    },
  });

  // Handlers
  const handleSelectPet = useCallback(
    (petId: string) => {
      setSelectedPetId(petId);
    },
    [setSelectedPetId]
  );

  // Swipe to change pet
  const handleSwipePet = useCallback(
    (direction: "left" | "right") => {
      if (pets.length <= 1) return;
      const currentIndex = pets.findIndex((p) => p.id === selectedPetId);
      if (currentIndex === -1) return;

      let newIndex: number;
      if (direction === "right") {
        newIndex = (currentIndex + 1) % pets.length;
      } else {
        newIndex = currentIndex === 0 ? pets.length - 1 : currentIndex - 1;
      }
      setSelectedPetId(pets[newIndex].id);
    },
    [pets, selectedPetId, setSelectedPetId]
  );

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((event) => {
      if (event.velocityX < -500) {
        handleSwipePet("left");
      } else if (event.velocityX > 500) {
        handleSwipePet("right");
      }
    })
    .runOnJS(true);

  const handleCopyEmail = useCallback(async () => {
    if (!selectedPet) return;
    const email = `${selectedPet.email_id}@pawbuck.app`;
    await Clipboard.setStringAsync(email);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }, [selectedPet]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["vaccinations", selectedPetId],
      }),
      queryClient.invalidateQueries({ queryKey: ["medicines", selectedPetId] }),
      queryClient.invalidateQueries({
        queryKey: ["care_team_members", selectedPetId],
      }),
      refreshPendingApprovals(),
    ]);
    setRefreshing(false);
  }, [queryClient, selectedPetId, refreshPendingApprovals]);

  const handleAddCareTeamMember = (type: CareTeamMemberType) => {
    setSelectedMemberType(type);
    setSelectedMember(null);
    setShowCareTeamModal(true);
  };

  const handleEditCareTeamMember = (member: VetInformation) => {
    setSelectedMember(member);
    setSelectedMemberType(
      ((member as any).type as CareTeamMemberType) || "veterinarian"
    );
    setShowCareTeamModal(true);
  };

  const handleSaveCareTeamMember = async (data: CareTeamMemberSaveData) => {
    if (!selectedPetId) return;
    const { memberData } = data;

    try {
      if (selectedMember) {
        // Editing existing member - only update the member data
        await updateCareTeamMemberMutation.mutateAsync({
          id: selectedMember.id,
          data: memberData as TablesUpdate<"vet_information">,
        });
      } else {
        // Creating new member - use dedup logic and link to all user pets
        await createCareTeamMemberMutation.mutateAsync({
          memberData: memberData as TablesInsert<"vet_information">,
        });
      }
      // Care team members are automatically whitelisted via pet_care_team_members junction table
      // No need to manually add to pet_email_list
      setShowCareTeamModal(false);
      setSelectedMember(null);
    } catch (error) {
      console.error("Error saving care team member:", error);
    }
  };

  const handleDeleteCareTeamMember = async () => {
    if (selectedMember) {
      await deleteCareTeamMemberMutation.mutateAsync(selectedMember.id);
      setShowCareTeamModal(false);
      setSelectedMember(null);
    }
  };

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (selectedPetId) {
        queryClient.invalidateQueries({
          queryKey: ["vaccinations", selectedPetId],
        });
        queryClient.invalidateQueries({
          queryKey: ["medicines", selectedPetId],
        });
        queryClient.invalidateQueries({
          queryKey: ["care_team_members", selectedPetId],
        });
      }
      refreshPendingApprovals();
    }, [selectedPetId, queryClient, refreshPendingApprovals])
  );

  // Loading states
  if (addingPet) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text className="mt-4 text-xl" style={{ color: theme.foreground }}>
          Adding your pet...
        </Text>
      </View>
    );
  }

  if (loadingPets) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text className="mt-4 text-xl" style={{ color: theme.foreground }}>
          Loading your pets...
        </Text>
      </View>
    );
  }

  // Empty state
  if (pets.length === 0) {
    return (
      <GestureHandlerRootView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
      >
        <LinearGradient
          colors={
            isDarkMode
              ? ["#050D10", "#0D2B2A", "#050D10"]
              : ["#3BD0D2", "#049FB0", "#3BD0D2"]
          }
          locations={[0, 0.5, 1]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        <AnimatedParticles />
        <HomeHeader />
        <View className="flex-1 items-center justify-center px-8">
          <View
            className="w-32 h-32 rounded-full items-center justify-center mb-6"
            style={{
              backgroundColor: isDarkMode
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(255, 255, 255, 0.2)",
            }}
          >
            <Ionicons name="paw" size={64} color="#FFFFFF" />
          </View>
          <Text
            className="text-3xl font-bold text-center mb-2"
            style={{ color: theme.foreground }}
          >
            No pets yet
          </Text>
          <Text
            className="text-lg text-center mb-8"
            style={{ color: theme.secondary }}
          >
            Add your first furry friend to get started
          </Text>

          {/* Option Buttons */}
          <View className="w-full max-w-md gap-3">
            {/* Add Your First Pet */}
            <TouchableOpacity
              onPress={() => router.push("/onboarding/step1")}
              className="px-8 py-4 rounded-2xl flex-row items-center justify-center"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: isDarkMode ? theme.border : "rgba(0, 0, 0, 0.1)",
              }}
              activeOpacity={0.7}
            >
              <View
                className="w-8 h-8 rounded-full items-center justify-center mr-3"
                style={{
                  backgroundColor: isDarkMode
                    ? theme.border
                    : "rgba(0, 0, 0, 0.05)",
                }}
              >
                <Ionicons name="add" size={20} color={theme.primary} />
              </View>
              <Text
                className="text-lg font-bold"
                style={{ color: theme.primary }}
              >
                Add Your First Pet
              </Text>
            </TouchableOpacity>

            {/* Join Household */}
            <TouchableOpacity
              onPress={() => router.push("/join-household")}
              className="px-8 py-4 rounded-2xl flex-row items-center justify-center"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: isDarkMode ? theme.border : "rgba(0, 0, 0, 0.1)",
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="account-group-outline"
                size={24}
                color={theme.primary}
                style={{ marginRight: 8 }}
              />
              <Text
                className="text-lg font-bold"
                style={{ color: theme.primary }}
              >
                Join Family Circle
              </Text>
            </TouchableOpacity>

            {/* Transfer Pet */}
            <TouchableOpacity
              onPress={() => router.push("/transfer-pet")}
              className="px-8 py-4 rounded-2xl flex-row items-center justify-center"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: isDarkMode ? theme.border : "rgba(0, 0, 0, 0.1)",
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="swap-horizontal"
                size={24}
                color={theme.primary}
                style={{ marginRight: 8 }}
              />
              <Text
                className="text-lg font-bold"
                style={{ color: theme.primary }}
              >
                Transfer Pet with Code
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (!selectedPet) {
    return null;
  }

  return (
    <GestureHandlerRootView
      className="flex-1"
      style={{ backgroundColor: theme.background }}
    >
      {/* Background Gradient - Only in dark mode */}
      <>
        <LinearGradient
          colors={
            isDarkMode
              ? ["#050D10", "#0A1B1B", "#050D10"]
              : ["#ffffff", "#E1F5F8", "#ffffff"]
          }
          locations={[0, 0.5, 1]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        {/* Animated Floating Particles */}
        <AnimatedParticles />
      </>

      {/* Header */}
      <HomeHeader />

      {/* Main Content with Swipe Gesture */}
      <GestureDetector gesture={swipeGesture}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {/* Pet Selector */}
          <View className="mb-5 px-4">
            <PetSelector
              pets={pets}
              selectedPetId={selectedPetId}
              onSelectPet={handleSelectPet}
              notificationCounts={notificationCounts}
            />
          </View>

          {/* Pet Photo Card */}
          {selectedPet && (
            <View className="mx-4 mb-4 rounded-3xl overflow-hidden">
              <PetImage pet={selectedPet} style="hero" />
            </View>
          )}

          {/* Pet Email */}
          {selectedPet && (
            <View className="mx-4 mb-6 items-center">
              <TouchableOpacity
                className="flex-row items-center gap-2 px-5 py-3 rounded-full"
                style={{
                  backgroundColor:
                    mode === "dark" ? theme.card : theme.border + "80",
                  borderWidth: mode === "dark" ? 1 : 0,
                  borderColor: theme.border,
                }}
                onPress={handleCopyEmail}
                activeOpacity={0.7}
              >
                <Text
                  className="text-lg font-medium"
                  style={{ color: emailCopied ? "#22C55E" : theme.foreground }}
                >
                  {selectedPet.email_id}@pawbuck.app
                </Text>
                <Ionicons
                  name={emailCopied ? "checkmark" : "copy-outline"}
                  size={18}
                  color={emailCopied ? "#22C55E" : theme.secondary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Daily Wellness Section */}
          {selectedPet && (
            <View className="mb-6">
              <DailyWellnessSection
                petId={selectedPet.id}
                vaccinations={vaccinations}
                petCountry={selectedPet.country}
              />
            </View>
          )}

          {/* Today's Medications Section */}
          {selectedPet && medicines.length > 0 && (
            <View className="mb-6">
              <TodaysMedicationsSection
                petId={selectedPet.id}
                medicines={medicines}
              />
            </View>
          )}

          {/* Daily Intake Section */}
          {selectedPet && (
            <View className="mb-6">
              <DailyIntakeSection petId={selectedPet.id} />
            </View>
          )}

          {/* Health Records Section */}
          {selectedPet && (
            <View className="mb-6">
              <HealthRecordsSection petId={selectedPet.id} />
            </View>
          )}

          {/* My Care Team Section */}
          {selectedPet && (
            <View className="mb-8">
              <MyCareTeamSection
                careTeamMembers={careTeamMembers}
                onAddMember={handleAddCareTeamMember}
                onEditMember={handleEditCareTeamMember}
                readOnly={true}
              />
            </View>
          )}

          {/* Bottom Padding for scroll */}
          <View className="h-4" />
        </ScrollView>
      </GestureDetector>

      {/* Bottom Navigation */}
      <BottomNavBar activeTab="home" selectedPetId={selectedPetId} />

      {/* Care Team Member Modal */}
      {showCareTeamModal && selectedPet && (
        <CareTeamMemberModal
          visible={showCareTeamModal}
          onClose={() => {
            setShowCareTeamModal(false);
            setSelectedMember(null);
          }}
          onSave={handleSaveCareTeamMember}
          onDelete={selectedMember ? handleDeleteCareTeamMember : undefined}
          memberInfo={selectedMember}
          memberType={selectedMemberType}
          petId={selectedPet.id}
          allPets={pets}
          loading={
            createCareTeamMemberMutation.isPending ||
            updateCareTeamMemberMutation.isPending ||
            deleteCareTeamMemberMutation.isPending
          }
        />
      )}
    </GestureHandlerRootView>
  );
}
