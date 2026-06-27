import BookVetVisitSection from "@/components/home/BookVetVisitSection";
import TodayHabitPanel from "@/components/home/TodayHabitPanel";
import HomeMiloDepthCard from "@/components/home/HomeMiloDepthCard";
import HomePetHeroCard from "@/components/home/HomePetHeroCard";
import HomeSectionHeader from "@/components/home/HomeSectionHeader";
import WeeklyChallengeCard from "@/components/home/WeeklyChallengeCard";
import BottomNavBar from "@/components/home/BottomNavBar";
import {
  CareTeamMemberModal,
  CareTeamMemberSaveData,
} from "@/components/home/CareTeamMemberModal";
import HomeHeader from "@/components/home/HomeHeader";
import MyCareTeamSection from "@/components/home/MyCareTeamSection";
import PetSelector from "@/components/home/PetSelector";
import HealthBriefingSummaryCard from "@/components/petJournal/HealthBriefingSummaryCard";
import PetJournalHomeCard from "@/components/petJournal/PetJournalHomeCard";
import { StreakUpgradeBanner } from "@/components/subscription/StreakUpgradeBanner";
import { useSubscription } from "@/context/subscriptionContext";
import { useAuth } from "@/context/authContext";
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
import { fetchMessageThreads } from "@/services/messages";
import { fetchMedicines } from "@/services/medicines";
import { fetchHealthBriefingBundle } from "@/services/healthBriefing";
import { getDailyIntake } from "@/services/dailyIntake";
import { PAWTHON_DEFAULT_GOAL_METERS } from "@/constants/pawthonGoals";
import {
  fetchMyWeeklyWalkerRankForCountry,
  fetchPawthonDailyStats,
  fetchRecentWalkSessions,
} from "@/services/walkSessions";
import { getDailyGoalMeters } from "@/services/pawthonGoalPrefs";
import { useAddPetNavigation } from "@/hooks/useAddPetNavigation";
import HealthNotesFlowConnector from "@/components/home/HealthNotesFlowConnector";
import { SHOW_VET_BOOKING_UI } from "@/constants/vetBooking";
import { useWeeklyChallengeEnabled } from "@/hooks/useWeeklyChallengeEnabled";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import { buildHomeTodaySnapshot } from "@/utils/homeTodaySnapshot";
import { healthRecordBodyTrackerHref } from "@/utils/healthRecordNavigation";
import { computeTodayDashboardProgress } from "@/utils/todayDashboardProgress";
import { openMiloJournalCheckIn } from "@/utils/openMiloJournalCheckIn";
import { pawthonWalkStartRoute } from "@/utils/pawthonWalkNavigation";
import { computeBriefingCategorySignals } from "@/utils/healthBriefingUi";
import { journalEntryNeedsTriageAttention } from "@/utils/journalTriage";
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
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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
  } = usePets();
  const { selectedPetId, selectedPet, setSelectedPetId } = useSelectedPet();
  const { refreshPendingApprovals, pendingApprovals } = useEmailApproval();
  const { user } = useAuth();
  const { navigateToAddPet } = useAddPetNavigation();
  const { weeklyChallengeEnabled } = useWeeklyChallengeEnabled(selectedPet?.country);
  const {
    aiJournalEntriesRemaining,
    status: subscriptionStatus,
    canStartAiJournal,
    openPaywall,
    refetchEntitlement,
  } = useSubscription();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [showCareTeamModal, setShowCareTeamModal] = useState(false);
  const [selectedMemberType, setSelectedMemberType] =
    useState<CareTeamMemberType>("veterinarian");
  const [selectedMember, setSelectedMember] = useState<VetInformation | null>(null);
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

  const { data: healthBriefing } = useQuery({
    queryKey: ["health_briefing", selectedPetId],
    queryFn: () => fetchHealthBriefingBundle(selectedPetId!),
    enabled: !!selectedPetId,
  });

  const todaySnapshot = useMemo(() => {
    if (!selectedPetId) return null;
    const vetFlaggedCount =
      healthBriefing?.journal.filter((j) => journalEntryNeedsTriageAttention(j)).length ?? 0;
    const categories = healthBriefing
      ? computeBriefingCategorySignals({
          weightValue: selectedPet?.weight_value,
          allergiesCount: healthBriefing.allergies.length,
          vaccinations: healthBriefing.vaccinations,
          medicines: healthBriefing.medicines,
        })
      : null;
    return buildHomeTodaySnapshot({
      petId: selectedPetId,
      vaccinations,
      medicines,
      petCountry: selectedPet?.country,
      vetFlaggedCount,
      categories,
    });
  }, [selectedPetId, selectedPet, vaccinations, medicines, healthBriefing]);

  const openMiloCheckIn = useCallback(() => {
    if (!selectedPet) return;
    if (!canStartAiJournal) {
      openPaywall({
        source: "ai_journal",
        copyVariant: "ai_journal_entry_cap",
        requiredPlan: "individual",
      });
      void refetchEntitlement();
      return;
    }
    openMiloJournalCheckIn(router, selectedPet.id);
  }, [canStartAiJournal, openPaywall, refetchEntitlement, router, selectedPet]);

  const { data: careTeamMembers = [] } = useQuery({
    queryKey: ["care_team_members", selectedPetId],
    queryFn: () => getCareTeamMembersForPet(selectedPetId!),
    enabled: !!selectedPetId,
  });

  const { data: goalMeters = PAWTHON_DEFAULT_GOAL_METERS } = useQuery({
    queryKey: ["pawthon", "goalMeters"],
    queryFn: getDailyGoalMeters,
  });

  const { data: pawthonHome } = useQuery({
    queryKey: ["pawthon", "home", selectedPetId, goalMeters],
    queryFn: async () => {
      const [stats, walks] = await Promise.all([
        fetchPawthonDailyStats(selectedPetId!, goalMeters),
        fetchRecentWalkSessions(selectedPetId!, 1),
      ]);
      return { ...stats, lastWalk: walks[0] ?? null };
    },
    enabled: !!selectedPetId,
  });

  const { data: dailyIntake } = useQuery({
    queryKey: ["daily_intake", selectedPetId],
    queryFn: () => getDailyIntake(selectedPetId!),
    enabled: !!selectedPetId,
  });

  const { data: pawthonStats } = useQuery({
    queryKey: ["pawthon", selectedPetId],
    queryFn: async () => fetchPawthonDailyStats(selectedPetId!, goalMeters),
    enabled: weeklyChallengeEnabled && !!selectedPetId,
  });

  const streakDays = pawthonHome?.streak ?? pawthonStats?.streak ?? 0;
  const todayMeters = pawthonHome?.todayMeters ?? 0;

  const todayProgress = useMemo(
    () =>
      computeTodayDashboardProgress({
        foodIntake: dailyIntake?.food_intake ?? 0,
        foodTarget: dailyIntake?.food_target ?? 3,
        waterIntake: dailyIntake?.water_intake ?? 0,
        waterTarget: dailyIntake?.water_target ?? 4,
        poopCount: dailyIntake?.poop_count ?? 0,
        peeCount: dailyIntake?.pee_count ?? 0,
        todayMeters,
        goalMeters,
      }),
    [dailyIntake, todayMeters, goalMeters]
  );

  const petCountry = selectedPet?.country?.trim() ?? "";

  const { data: weeklyWalkerRank } = useQuery({
    queryKey: ["pawthon", "weeklyWalkerRank", petCountry],
    queryFn: () => fetchMyWeeklyWalkerRankForCountry(petCountry),
    enabled: weeklyChallengeEnabled && !!user && petCountry.length > 0,
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["health_briefing", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["vaccinations", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["medicines", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["pet_journal_home", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["messageThreads"] }),
      queryClient.invalidateQueries({ queryKey: ["pawthon", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["daily_intake", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["pawthon", "home", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["pawthon", "hub", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["pawthon", "history", selectedPetId] }),
      ...(weeklyChallengeEnabled
        ? [queryClient.invalidateQueries({ queryKey: ["pawthon", "weeklyWalkerRank"] })]
        : []),
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

  useFocusEffect(
    useCallback(() => {
      if (selectedPetId) {
        queryClient.invalidateQueries({ queryKey: ["health_briefing", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["vaccinations", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["medicines", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["pawthon", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["pawthon", "home", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["pawthon", "hub", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["pawthon", "history", selectedPetId] });
        if (weeklyChallengeEnabled) {
          queryClient.invalidateQueries({ queryKey: ["pawthon", "weeklyWalkerRank"] });
        }
      }
      refreshPendingApprovals();
    }, [selectedPetId, queryClient, refreshPendingApprovals, weeklyChallengeEnabled])
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
          <Text style={{ fontSize: 18, textAlign: "center", marginBottom: 24, color: theme.secondary }}>
            Add a pet, join a household with an invite code, or claim a transferred pet
          </Text>
          <TouchableOpacity
            testID="home-add-first-pet"
            accessibilityRole="button"
            accessibilityLabel="Add Your First Pet"
            onPress={() => navigateToAddPet(false)}
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
              marginBottom: 12,
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
          <TouchableOpacity
            onPress={() => router.push("/join-household")}
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
              marginBottom: 12,
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
              <Ionicons name="people" size={20} color={theme.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.primary }}>
              Join with Invite Code
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/transfer-pet")}
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
              <Ionicons name="swap-horizontal" size={20} color={theme.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.primary }}>
              Claim a Transferred Pet
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
          {/* Pet selector */}
          <View style={{ marginBottom: 12 }}>
            <PetSelector
              pets={pets}
              selectedPetId={selectedPetId}
              onSelectPet={handleSelectPet}
              notificationCounts={notificationCounts}
            />
            {pets.length > 1 ? (
              <Text
                style={{
                  fontSize: 12,
                  color: theme.secondary,
                  textAlign: "center",
                  marginTop: 8,
                  paddingHorizontal: 20,
                }}
              >
                Swipe anywhere on the screen to switch pets
              </Text>
            ) : null}
          </View>

          {selectedPet ? (
            <>
              <HomePetHeroCard
                pet={selectedPet}
                streakDays={streakDays}
              />

              <TodayHabitPanel
                petId={selectedPet.id}
                petName={selectedPet.name}
                todayProgress={todayProgress}
                streakDays={streakDays}
                walkGoalMeters={goalMeters}
                walkTodayMeters={todayMeters}
                onStartWalk={() => router.push(pawthonWalkStartRoute(pets, selectedPet.id))}
                onViewWalkLog={() => router.push("/(home)/pawthon/history" as any)}
                onOpenBodyTracker={(segment) =>
                  router.push(
                    healthRecordBodyTrackerHref(selectedPet.id, segment ?? "output") as any
                  )
                }
              />

              {todaySnapshot ? (
                <HomeMiloDepthCard
                  petId={selectedPet.id}
                  petName={selectedPet.name}
                  snapshot={todaySnapshot}
                  onCheckInWithMilo={openMiloCheckIn}
                  aiJournalEntriesRemaining={aiJournalEntriesRemaining}
                  aiJournalEntriesUsed={subscriptionStatus?.usage.aiJournalEntriesUsed ?? 0}
                />
              ) : null}

              <HomeSectionHeader title="For your vet" subtitle="Notes in → briefing out" />

              <View style={{ marginBottom: 0, paddingHorizontal: 20 }}>
                <PetJournalHomeCard pet={selectedPet} variant="recent" />
              </View>

              <HealthNotesFlowConnector />

              <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                <HealthBriefingSummaryCard
                  petId={selectedPet.id}
                  pet={selectedPet}
                  title="Vet briefing"
                  hidePetAvatar
                  onPress={() =>
                    router.push({
                      pathname: "/(home)/pet-journal/briefing",
                      params: { petId: selectedPet.id },
                    } as any)
                  }
                />
              </View>

              <StreakUpgradeBanner streakDays={streakDays} />

              {weeklyChallengeEnabled ? (
                <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                  <WeeklyChallengeCard
                    petName={selectedPet.name}
                    weekKm={pawthonHome?.weekKm ?? pawthonStats?.weekKm ?? 0}
                    streakDays={streakDays}
                    walkerRank={weeklyWalkerRank?.rank ?? null}
                    walkerTotal={weeklyWalkerRank?.total ?? 0}
                    onPress={() => router.push("/(home)/pawthon/weekly" as any)}
                  />
                </View>
              ) : null}

              {SHOW_VET_BOOKING_UI ? (
                <View style={{ marginBottom: 24 }}>
                  <BookVetVisitSection
                    petName={selectedPet.name}
                    onSchedule={() => router.push("/book-vet-visit" as any)}
                  />
                </View>
              ) : null}

              <HomeSectionHeader title="Care team" subtitle="Vets and caregivers on file" />

              <View style={{ marginBottom: 32 }}>
                <MyCareTeamSection
                  careTeamMembers={careTeamMembers}
                  onAddMember={handleAddCareTeamMember}
                  onEditMember={handleEditCareTeamMember}
                />
              </View>
            </>
          ) : null}

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

    </View>
  );
}
