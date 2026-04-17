import BookVetVisitSection from "@/components/home/BookVetVisitSection";
import DailyGoalWalkCard from "@/components/home/DailyGoalWalkCard";
import WeeklyChallengeCard from "@/components/home/WeeklyChallengeCard";
import BottomNavBar from "@/components/home/BottomNavBar";
import {
  CareTeamMemberModal,
  CareTeamMemberSaveData,
} from "@/components/home/CareTeamMemberModal";
import CatchUpSection from "@/components/home/CatchUpSection";
import BodyTrackerSection from "@/components/home/BodyTrackerSection";
import HomeHeader from "@/components/home/HomeHeader";
import MyCareTeamSection from "@/components/home/MyCareTeamSection";
import PetImage from "@/components/home/PetImage";
import PetSelector from "@/components/home/PetSelector";
import HealthBriefingSummaryCard from "@/components/petJournal/HealthBriefingSummaryCard";
import EmailOnboardingModal from "@/components/onboarding/EmailOnboardingModal";
import { useAuth } from "@/context/authContext";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { hasSeenEmailOnboarding } from "@/utils/onboardingStorage";
import { TablesInsert, TablesUpdate } from "@/database.types";
import {
  getCareTeamMembersForPet,
  linkCareTeamMemberToAllUserPets,
  unlinkCareTeamMemberFromPet,
} from "@/services/careTeamMembers";
import { fetchMessageThreads } from "@/services/messages";
import { fetchMedicines } from "@/services/medicines";
import {
  fetchMyWeeklyWalkerRank,
  fetchPawthonDashboardStats,
} from "@/services/walkSessions";
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
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [emailCopied, setEmailCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCareTeamModal, setShowCareTeamModal] = useState(false);
  const [selectedMemberType, setSelectedMemberType] =
    useState<CareTeamMemberType>("veterinarian");
  const [selectedMember, setSelectedMember] = useState<VetInformation | null>(null);
  const [showEmailOnboarding, setShowEmailOnboarding] = useState(false);

  const { data: messageThreads = [] } = useQuery({
    queryKey: ["messageThreads"],
    queryFn: () => fetchMessageThreads(),
  });

  const notificationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pendingApprovals.forEach((approval) => {
      counts[approval.pet_id] = (counts[approval.pet_id] || 0) + 1;
    });
    messageThreads.forEach((thread) => {
      const petId = thread.pet_id;
      if (petId) {
        counts[petId] = (counts[petId] || 0) + (thread.unread_count ?? 0);
      }
    });
    return counts;
  }, [pendingApprovals, messageThreads]);

  const { data: vaccinations = [] } = useQuery({
    queryKey: ["vaccinations", selectedPetId],
    queryFn: () => getVaccinationsByPetId(selectedPetId!),
    enabled: !!selectedPetId,
  });

  const { data: medicines = [] } = useQuery({
    queryKey: ["medicines", selectedPetId],
    queryFn: () => fetchMedicines(selectedPetId!),
    enabled: !!selectedPetId,
  });

  const { data: careTeamMembers = [] } = useQuery({
    queryKey: ["care_team_members", selectedPetId],
    queryFn: () => getCareTeamMembersForPet(selectedPetId!),
    enabled: !!selectedPetId,
  });

  const { data: pawthonStats } = useQuery({
    queryKey: ["pawthon", selectedPetId],
    queryFn: () => fetchPawthonDashboardStats(selectedPetId!),
    enabled: !!selectedPetId,
  });

  const { data: weeklyWalkerRank } = useQuery({
    queryKey: ["pawthon", "weeklyWalkerRank"],
    queryFn: fetchMyWeeklyWalkerRank,
    enabled: !!user,
  });

  const createCareTeamMemberMutation = useMutation({
    mutationFn: async ({
      memberData,
    }: {
      memberData: TablesInsert<"vet_information">;
    }) => {
      const existingMember = await findExistingCareTeamMember(
        memberData.email,
        memberData.phone
      );
      let careTeamMemberId: string;
      if (existingMember) {
        await updateVetInformation(existingMember.id, memberData);
        careTeamMemberId = existingMember.id;
      } else {
        const newMember = await createVetInformation(memberData);
        careTeamMemberId = newMember.id;
      }
      const petIds = await linkCareTeamMemberToAllUserPets(careTeamMemberId);
      return { careTeamMemberId, petIds };
    },
    onSuccess: (result) => {
      result.petIds.forEach((petId) => {
        queryClient.invalidateQueries({ queryKey: ["care_team_members", petId] });
      });
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

  const handleSelectPet = useCallback(
    (petId: string) => setSelectedPetId(petId),
    [setSelectedPetId]
  );

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
      if (event.velocityX < -500) handleSwipePet("left");
      else if (event.velocityX > 500) handleSwipePet("right");
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
      queryClient.invalidateQueries({ queryKey: ["messageThreads"] }),
      queryClient.invalidateQueries({ queryKey: ["pawthon", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["pawthon", "hub", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["pawthon", "weeklyWalkerRank"] }),
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
    setSelectedMemberType(((member as any).type as CareTeamMemberType) || "veterinarian");
    setShowCareTeamModal(true);
  };

  const handleSaveCareTeamMember = async (data: CareTeamMemberSaveData) => {
    if (!selectedPetId) return;
    const { memberData } = data;
    try {
      if (selectedMember) {
        await updateCareTeamMemberMutation.mutateAsync({
          id: selectedMember.id,
          data: memberData as TablesUpdate<"vet_information">,
        });
      } else {
        await createCareTeamMemberMutation.mutateAsync({
          memberData: memberData as TablesInsert<"vet_information">,
        });
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

  useEffect(() => {
    const checkEmailOnboarding = async () => {
      if (selectedPet?.email_id) {
        const hasSeen = await hasSeenEmailOnboarding();
        if (!hasSeen) setShowEmailOnboarding(true);
      }
    };
    checkEmailOnboarding();
  }, [selectedPet?.email_id]);

  useFocusEffect(
    useCallback(() => {
      if (selectedPetId) {
        queryClient.invalidateQueries({ queryKey: ["vaccinations", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["medicines", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["pawthon", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["pawthon", "hub", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["pawthon", "weeklyWalkerRank"] });
      }
      refreshPendingApprovals();
    }, [selectedPetId, queryClient, refreshPendingApprovals])
  );

  // Loading states
  if (addingPet) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 16, fontSize: 20, color: theme.foreground }}>
          Adding your pet...
        </Text>
      </View>
    );
  }

  if (loadingPets) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 16, fontSize: 20, color: theme.foreground }}>
          Loading your pets...
        </Text>
      </View>
    );
  }

  // Empty state
  if (pets.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <HomeHeader />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <View
            style={{
              width: 128,
              height: 128,
              borderRadius: 64,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              backgroundColor: isDarkMode ? "rgba(255,255,255,0.2)" : theme.card,
              borderWidth: isDarkMode ? 0 : 1,
              borderColor: isDarkMode ? "transparent" : theme.border,
            }}
          >
            <Ionicons name="paw" size={64} color={isDarkMode ? "#FFFFFF" : theme.primary} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 8, color: theme.foreground }}>
            No pets yet
          </Text>
          <Text style={{ fontSize: 18, textAlign: "center", marginBottom: 32, color: theme.secondary }}>
            Add your first furry friend to get started
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/onboarding/step1")}
            style={{
              width: "100%",
              maxWidth: 320,
              paddingHorizontal: 32,
              paddingVertical: 16,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                backgroundColor: isDarkMode ? theme.border : "rgba(0,0,0,0.05)",
              }}
            >
              <Ionicons name="add" size={20} color={theme.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.primary }}>
              Add Your First Pet
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!selectedPet) return null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <HomeHeader notificationCount={selectedPetId ? (notificationCounts[selectedPetId] || 0) : 0} />

      {/* Main Scrollable Content */}
      <GestureDetector gesture={swipeGesture}>
        <ScrollView
          style={{ flex: 1 }}
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
          {/* 1. Pet selector + profile photo */}
          <View style={{ marginBottom: 16 }}>
            <PetSelector
              pets={pets}
              selectedPetId={selectedPetId}
              onSelectPet={handleSelectPet}
              notificationCounts={notificationCounts}
            />
          </View>

          {selectedPet && (
            <View style={{ marginBottom: 20 }}>
              <PetImage
                pet={selectedPet}
                style="hero"
                onCopyEmail={handleCopyEmail}
                emailCopied={emailCopied}
              />
            </View>
          )}

          {/* 2. Health Briefing */}
          {selectedPet && (
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <HealthBriefingSummaryCard
                petId={selectedPet.id}
                pet={selectedPet}
                onPress={() =>
                  router.push({
                    pathname: "/(home)/pet-journal/briefing",
                    params: { petId: selectedPet.id },
                  } as any)
                }
              />
            </View>
          )}

          {/* 3. Pet Journal */}
          {selectedPet && (
            <View style={{ marginBottom: 24, paddingHorizontal: 20 }}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/(home)/pet-journal",
                    params: { petId: selectedPet.id },
                  } as any)
                }
                activeOpacity={0.85}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                  borderRadius: 20,
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  ...(Platform.OS === "android"
                    ? {}
                    : {
                        borderWidth: 1,
                        borderColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                      }),
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "#EDEDEE",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Ionicons name="book-outline" size={22} color={theme.foreground} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Pet Journal</Text>
                  <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 2 }}>
                    Log health, behavior & environment
                  </Text>
                </View>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                  }}
                >
                  <MaterialCommunityIcons name="arrow-top-right" size={20} color={theme.secondary} />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* 4. Catch up */}
          {selectedPet && (
            <View style={{ marginBottom: 24 }}>
              <CatchUpSection
                petId={selectedPet.id}
                vaccinations={vaccinations}
                medicines={medicines}
                petCountry={selectedPet.country}
              />
            </View>
          )}

          {/* 5. Body Tracker */}
          {selectedPet && (
            <View style={{ marginBottom: 24 }}>
              <BodyTrackerSection petId={selectedPet.id} />
            </View>
          )}

          {/* 6. Daily walking goal */}
          {selectedPet && (
            <DailyGoalWalkCard
              petName={selectedPet.name}
              onStartWalk={() => router.push("/pawthon-walk")}
            />
          )}

          {/* 7. Weekly Challenge */}
          {selectedPet && (
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <WeeklyChallengeCard
                petName={selectedPet.name}
                weekKm={pawthonStats?.weekKm ?? 0}
                streakDays={pawthonStats?.streak ?? 0}
                walkerRank={weeklyWalkerRank?.rank ?? null}
                walkerTotal={weeklyWalkerRank?.total ?? 0}
                onPress={() => router.push("/leaderboard")}
              />
            </View>
          )}

          {/* Book a vet visit */}
          {selectedPet && (
            <View style={{ marginBottom: 24 }}>
              <BookVetVisitSection
                petName={selectedPet.name}
                onSchedule={() => router.push("/book-vet-visit")}
              />
            </View>
          )}

          {/* My Care Team */}
          {selectedPet && (
            <View style={{ marginBottom: 32 }}>
              <MyCareTeamSection
                careTeamMembers={careTeamMembers}
                onAddMember={handleAddCareTeamMember}
                onEditMember={handleEditCareTeamMember}
                readOnly={true}
              />
            </View>
          )}

          <View style={{ height: 8 }} />
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

      {/* Email Onboarding Modal */}
      {selectedPet?.email_id && (
        <EmailOnboardingModal
          visible={showEmailOnboarding}
          petEmail={`${selectedPet.email_id}@pawbuck.app`}
          onClose={() => setShowEmailOnboarding(false)}
        />
      )}
    </View>
  );
}
