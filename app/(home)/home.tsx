import { AnimatedParticles } from "@/components/animations/AnimatedParticles";
import { MiloChatModal } from "@/components/chat/MiloChatModal";
import BottomNavBar from "@/components/home/BottomNavBar";
import { CareTeamMemberModal } from "@/components/home/CareTeamMemberModal";
import DailyIntakeSection from "@/components/home/DailyIntakeSection";
import DailyWellnessSection from "@/components/home/DailyWellnessSection";
import HealthRecordsSection from "@/components/home/HealthRecordsSection";
import HomeHeader from "@/components/home/HomeHeader";
import MyCareTeamSection from "@/components/home/MyCareTeamSection";
import PetImage from "@/components/home/PetImage";
import PetSelector from "@/components/home/PetSelector";
import TodaysMedicationsSection from "@/components/home/TodaysMedicationsSection";
import { VetInfoModal } from "@/components/home/VetInfoModal";
import { ChatProvider } from "@/context/chatContext";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { TablesInsert, TablesUpdate } from "@/database.types";
import {
  getCareTeamMembersForPet,
  linkCareTeamMemberToPet,
  unlinkCareTeamMemberFromPet,
} from "@/services/careTeamMembers";
import { fetchMedicines } from "@/services/medicines";
import { addEmail } from "@/services/petEmailList";
import { linkVetToPet } from "@/services/pets";
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
  const { pets, loadingPets, addingPet, updatePet, updatingPet, deletePet, deletingPet } = usePets();
  const { refreshPendingApprovals, pendingApprovals } = useEmailApproval();
  const queryClient = useQueryClient();

  // State
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showVetModal, setShowVetModal] = useState(false);
  const [showCareTeamModal, setShowCareTeamModal] = useState(false);
  const [selectedMemberType, setSelectedMemberType] = useState<CareTeamMemberType>("veterinarian");
  const [selectedMember, setSelectedMember] = useState<VetInformation | null>(null);

  // Select first pet by default when pets load
  React.useEffect(() => {
    if (pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id);
    }
  }, [pets, selectedPetId]);

  // Get the selected pet
  const selectedPet = useMemo(() => {
    return pets.find((p) => p.id === selectedPetId) || null;
  }, [pets, selectedPetId]);

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

  // Fetch vet information if pet has one linked
  const { data: vetInfo, isLoading: loadingVetInfo } = useQuery({
    queryKey: ["vet_information", selectedPet?.vet_information_id],
    queryFn: () => getVetInformation(selectedPet!.vet_information_id!),
    enabled: !!selectedPet?.vet_information_id,
  });

  // Fetch care team members for the selected pet
  const { data: careTeamMembers = [] } = useQuery({
    queryKey: ["care_team_members", selectedPetId],
    queryFn: () => getCareTeamMembersForPet(selectedPetId!),
    enabled: !!selectedPetId,
  });

  // Mutations for vet info
  const createVetMutation = useMutation({
    mutationFn: async (vetData: TablesInsert<"vet_information">) => {
      const newVet = await createVetInformation(vetData);
      await linkVetToPet(selectedPetId!, newVet.id);
      return newVet;
    },
    onSuccess: (newVet) => {
      queryClient.setQueryData(["vet_information", newVet.id], newVet);
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPetId] });
    },
  });

  const updateVetMutation = useMutation({
    mutationFn: async (vetData: TablesUpdate<"vet_information">) => {
      if (!selectedPet?.vet_information_id) throw new Error("No vet info to update");
      return updateVetInformation(selectedPet.vet_information_id, vetData);
    },
    onSuccess: (updatedVet) => {
      queryClient.setQueryData(["vet_information", updatedVet.id], updatedVet);
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPetId] });
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
      queryClient.removeQueries({
        queryKey: ["vet_information", selectedPet?.vet_information_id],
      });
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPetId] });
    },
  });

  // Mutations for care team members (non-veterinarian)
  const createCareTeamMemberMutation = useMutation({
    mutationFn: async (memberData: TablesInsert<"vet_information">) => {
      const newMember = await createVetInformation(memberData);
      await linkCareTeamMemberToPet(selectedPetId!, newMember.id);
      return newMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPetId] });
    },
  });

  const updateCareTeamMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TablesUpdate<"vet_information"> }) => {
      return updateVetInformation(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPetId] });
      queryClient.invalidateQueries({ queryKey: ["vet_information"] });
    },
  });

  const deleteCareTeamMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await unlinkCareTeamMemberFromPet(selectedPetId!, memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPetId] });
    },
  });

  // Handlers
  const handleSelectPet = useCallback((petId: string) => {
    setSelectedPetId(petId);
  }, []);

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
    [pets, selectedPetId]
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
      queryClient.invalidateQueries({ queryKey: ["vaccinations", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["medicines", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPetId] }),
      refreshPendingApprovals(),
    ]);
    setRefreshing(false);
  }, [queryClient, selectedPetId, refreshPendingApprovals]);


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
    if (!selectedPetId) return;
    try {
      if (selectedMember) {
        await updateCareTeamMemberMutation.mutateAsync({
          id: selectedMember.id,
          data: memberData as TablesUpdate<"vet_information">,
        });
        // Automatically whitelist the email when updating a care team member
        if (memberData.email) {
          try {
            await addEmail(selectedPetId, memberData.email, false); // false = whitelisted
            // Invalidate whitelisted emails query to refresh the UI
            queryClient.invalidateQueries({ queryKey: ["whitelisted_emails", selectedPetId] });
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
            await addEmail(selectedPetId, memberData.email, false); // false = whitelisted
            // Invalidate whitelisted emails query to refresh the UI
            queryClient.invalidateQueries({ queryKey: ["whitelisted_emails", selectedPetId] });
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
        queryClient.invalidateQueries({ queryKey: ["vaccinations", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["medicines", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPetId] });
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
        <Text className="mt-4 text-lg" style={{ color: theme.foreground }}>
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
        <Text className="mt-4 text-lg" style={{ color: theme.foreground }}>
          Loading your pets...
        </Text>
      </View>
    );
  }

  // Empty state
  if (pets.length === 0) {
    return (
      <GestureHandlerRootView className="flex-1" style={{ backgroundColor: theme.background }}>
        <LinearGradient
          colors={isDarkMode 
            ? ["#050D10", "#0D2B2A", "#050D10"] 
            : ["#3BD0D2", "#049FB0", "#3BD0D2"]}
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
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: `${theme.primary}20` }}
          >
            <Ionicons name="paw" size={48} color={theme.primary} />
          </View>
          <Text
            className="text-2xl font-bold text-center mb-2"
            style={{ color: theme.foreground }}
          >
            No pets yet
          </Text>
          <Text
            className="text-base text-center mb-8"
            style={{ color: theme.secondary }}
          >
            Add your first furry friend to get started
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/onboarding/step1")}
            className="px-8 py-4 rounded-2xl"
            style={{ backgroundColor: theme.primary }}
            activeOpacity={0.7}
          >
            <Text className="text-base font-bold" style={{ color: theme.background }}>
              Add Your First Pet
            </Text>
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (!selectedPet) {
    return null;
  }

  return (
    <ChatProvider>
      <GestureHandlerRootView className="flex-1" style={{ backgroundColor: theme.background }}>
        {/* Background Gradient - Only in dark mode */}
        <>
          <LinearGradient
            colors={isDarkMode ? ["#050D10", "#0A1B1B", "#050D10"] : ["#ffffff", "#E1F5F8", "#ffffff"]}
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
          {isDarkMode && <AnimatedParticles />}
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

            {/* Pet Name & Email */}
            {selectedPet && (
              <View className="mx-4 mb-6">
                <Text
                  className="text-3xl font-bold text-center mb-2"
                  style={{ color: theme.foreground }}
                >
                  {selectedPet.name}
                </Text>
                <TouchableOpacity
                  className="flex-row items-center justify-center gap-2"
                  onPress={handleCopyEmail}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-base"
                    style={{ color: emailCopied ? "#22C55E" : theme.secondary }}
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
                  vetInfo={vetInfo}
                  careTeamMembers={careTeamMembers.filter(m => m.id !== vetInfo?.id)}
                  onAddMember={handleAddCareTeamMember}
                  onEditMember={handleEditCareTeamMember}
                  petId={selectedPet.id}
                  showOnlyWhitelisted={true}
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

        {/* Milo Chat Modal */}
        <MiloChatModal />


        {/* Vet Info Modal */}
        {showVetModal && selectedPet && (
          <VetInfoModal
            visible={showVetModal}
            onClose={() => setShowVetModal(false)}
            onSave={handleSaveVetInfo}
            onDelete={vetInfo ? handleDeleteVetInfo : undefined}
            vetInfo={vetInfo}
            petId={selectedPet.id}
            loading={createVetMutation.isPending || updateVetMutation.isPending}
          />
        )}

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
            loading={
              createCareTeamMemberMutation.isPending ||
              updateCareTeamMemberMutation.isPending ||
              deleteCareTeamMemberMutation.isPending
            }
          />
        )}
      </GestureHandlerRootView>
    </ChatProvider>
  );
}
