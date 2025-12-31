import { AnimatedParticles } from "@/components/animations/AnimatedParticles";
import { MiloChatButton } from "@/components/chat/MiloChatButton";
import { MiloChatModal } from "@/components/chat/MiloChatModal";
import HealthRecordsSection from "@/components/home/HealthRecordsSection";
import HealthStatusCards from "@/components/home/HealthStatusCards";
import HomeHeader from "@/components/home/HomeHeader";
import MyCareTeamSection from "@/components/home/MyCareTeamSection";
import { PetEditModal } from "@/components/home/PetEditModal";
import PetImage from "@/components/home/PetImage";
import PetSelector from "@/components/home/PetSelector";
import { VetInfoModal } from "@/components/home/VetInfoModal";
import { ChatProvider } from "@/context/chatContext";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { TablesInsert, TablesUpdate } from "@/database.types";
import { fetchMedicines } from "@/services/medicines";
import { linkVetToPet } from "@/services/pets";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import {
  createVetInformation,
  deleteVetInformation,
  getVetInformation,
  updateVetInformation,
} from "@/services/vetInformation";
import { getNearestMedicationDose } from "@/utils/medication";
import { getNearestUpcomingVaccination } from "@/utils/vaccinationHelpers";
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVetModal, setShowVetModal] = useState(false);

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

  // Compute health status
  const healthStatus = useMemo(() => {
    const nearestVaccination = getNearestUpcomingVaccination(vaccinations);
    const nearestMedication = getNearestMedicationDose(medicines);

    // Vaccine status
    let vaccineStatus = "None";
    if (vaccinations.length > 0) {
      vaccineStatus = nearestVaccination ? "Due soon" : "Up to date";
    }

    // Meds status
    let medsStatus = "None active";
    if (medicines.length > 0) {
      medsStatus = nearestMedication ? `${medicines.length} active` : "None active";
    }

    return { vaccineStatus, medsStatus };
  }, [vaccinations, medicines]);

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
    },
  });

  const updateVetMutation = useMutation({
    mutationFn: async (vetData: TablesUpdate<"vet_information">) => {
      if (!selectedPet?.vet_information_id) throw new Error("No vet info to update");
      return updateVetInformation(selectedPet.vet_information_id, vetData);
    },
    onSuccess: (updatedVet) => {
      queryClient.setQueryData(["vet_information", updatedVet.id], updatedVet);
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
        // Swipe right = next pet
        newIndex = (currentIndex + 1) % pets.length;
      } else {
        // Swipe left = previous pet
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
      refreshPendingApprovals(),
    ]);
    setRefreshing(false);
  }, [queryClient, selectedPetId, refreshPendingApprovals]);

  const handleUpdatePet = async (petId: string, petData: any) => {
    await updatePet(petId, petData);
  };

  const handleDeletePet = async (petId: string) => {
    await deletePet(petId);
    // Select next pet if available
    const remainingPets = pets.filter((p) => p.id !== petId);
    if (remainingPets.length > 0) {
      setSelectedPetId(remainingPets[0].id);
    } else {
      setSelectedPetId(null);
    }
  };

  const handleSaveVetInfo = async (
    vetData: TablesInsert<"vet_information"> | TablesUpdate<"vet_information">
  ) => {
    if (selectedPet?.vet_information_id && vetInfo) {
      await updateVetMutation.mutateAsync(vetData as TablesUpdate<"vet_information">);
    } else {
      await createVetMutation.mutateAsync(vetData as TablesInsert<"vet_information">);
    }
  };

  const handleDeleteVetInfo = async () => {
    await deleteVetMutation.mutateAsync();
  };

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (selectedPetId) {
        queryClient.invalidateQueries({ queryKey: ["vaccinations", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["medicines", selectedPetId] });
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
        {/* Background Gradient - Only in dark mode */}
        {isDarkMode && (
          <>
            <LinearGradient
              colors={["#050D10", "#0D2B2A", "#050D10"]}
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
        )}
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

  return (
    <ChatProvider>
      <GestureHandlerRootView className="flex-1" style={{ backgroundColor: theme.background }}>
        {/* Background Gradient - Only in dark mode */}
        {isDarkMode && (
          <>
            <LinearGradient
              colors={["#050D10", "#0A1B1B", "#050D10"]}
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
        )}

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
            <View className="mb-5">
              <PetSelector
                pets={pets}
                selectedPetId={selectedPetId}
                onSelectPet={handleSelectPet}
                notificationCounts={notificationCounts}
              />
            </View>

          {/* Pet Photo Card */}
          {selectedPet && (
            <View
              className="mx-4 mb-4 rounded-3xl overflow-hidden"
              style={{
                backgroundColor: theme.card,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <PetImage pet={selectedPet} style="hero" />
            </View>
          )}

          {/* Pet Email */}
          {selectedPet && (
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 mb-6"
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
          )}

          {/* Health Status Cards */}
          {selectedPet && (
            <View className="mb-6">
              <HealthStatusCards
                petId={selectedPet.id}
                vaccineStatus={healthStatus.vaccineStatus}
                medsStatus={healthStatus.medsStatus}
              />
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
                onAddVet={() => setShowVetModal(true)}
              />
            </View>
          )}

            {/* Bottom Padding for scroll */}
            <View className="h-4" />
          </ScrollView>
        </GestureDetector>

        {/* Bottom Navigation */}
        {/* <BottomNavBar
          activeTab="home"
          selectedPet={selectedPet}
          onPetAvatarPress={() => setShowEditModal(true)}
        /> */}

        {/* Milo Chat */}
        <MiloChatButton />
        <MiloChatModal />

        {/* Edit Modal */}
        {showEditModal && selectedPet && (
          <PetEditModal
            visible={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSave={handleUpdatePet}
            onDelete={handleDeletePet}
            pet={selectedPet}
            loading={updatingPet}
            deleting={deletingPet}
          />
        )}

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
      </GestureHandlerRootView>
    </ChatProvider>
  );
}
