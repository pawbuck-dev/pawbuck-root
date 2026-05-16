import BookVetVisitSection from "@/components/home/BookVetVisitSection";
import DailyGoalWalkCard from "@/components/home/DailyGoalWalkCard";
import MiloHomeLeadCard from "@/components/home/MiloHomeLeadCard";
import PetEmailMoatCard from "@/components/home/PetEmailMoatCard";
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
import PetJournalHomeCard from "@/components/petJournal/PetJournalHomeCard";
import { useAuth } from "@/context/authContext";
import { useChat } from "@/context/chatContext";
import { useSubscription } from "@/context/subscriptionContext";
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

/** Weekly challenge card (rank line only when cohort ≥ WEEKLY_CHALLENGE_RANK_COPY_MIN_COHORT). */
const SHOW_WEEKLY_CHALLENGE_ON_HOME = true;
/** Re-enable vet booking CTA on home when ready */
const SHOW_VET_BOOKING_ON_HOME = false;

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
  const { ensurePremium } = useSubscription();
  const { openChat } = useChat();
  const queryClient = useQueryClient();

  const [emailCopied, setEmailCopied] = useState(false);
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

  const { data: careTeamMembers = [] } = useQuery({
    queryKey: ["care_team_members", selectedPetId],
    queryFn: () => getCareTeamMembersForPet(selectedPetId!),
    enabled: !!selectedPetId,
  });

  const { data: pawthonStats } = useQuery({
    queryKey: ["pawthon", selectedPetId],
    queryFn: () => fetchPawthonDashboardStats(selectedPetId!),
    enabled: SHOW_WEEKLY_CHALLENGE_ON_HOME && !!selectedPetId,
  });

  const { data: weeklyWalkerRank } = useQuery({
    queryKey: ["pawthon", "weeklyWalkerRank"],
    queryFn: fetchMyWeeklyWalkerRank,
    enabled: SHOW_WEEKLY_CHALLENGE_ON_HOME && !!user,
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
      queryClient.invalidateQueries({ queryKey: ["pet_journal_home", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPetId] }),
      queryClient.invalidateQueries({ queryKey: ["messageThreads"] }),
      ...(SHOW_WEEKLY_CHALLENGE_ON_HOME
        ? [
            queryClient.invalidateQueries({ queryKey: ["pawthon", selectedPetId] }),
            queryClient.invalidateQueries({ queryKey: ["pawthon", "hub", selectedPetId] }),
            queryClient.invalidateQueries({ queryKey: ["pawthon", "weeklyWalkerRank"] }),
          ]
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
        queryClient.invalidateQueries({ queryKey: ["vaccinations", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["medicines", selectedPetId] });
        queryClient.invalidateQueries({ queryKey: ["care_team_members", selectedPetId] });
        if (SHOW_WEEKLY_CHALLENGE_ON_HOME) {
          queryClient.invalidateQueries({ queryKey: ["pawthon", selectedPetId] });
          queryClient.invalidateQueries({ queryKey: ["pawthon", "hub", selectedPetId] });
          queryClient.invalidateQueries({ queryKey: ["pawthon", "weeklyWalkerRank"] });
        }
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
            onPress={() => router.push("/(home)/add-pet")}
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
              <PetImage pet={selectedPet} style="hero" />
            </View>
          )}

          {/* Lead: Talk to Milo */}
          <MiloHomeLeadCard
            petName={selectedPet?.name}
            onOpenMilo={() => openChat()}
          />

          {/* Health Briefing + journal continuity */}
          {selectedPet && (
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <HealthBriefingSummaryCard
                petId={selectedPet.id}
                pet={selectedPet}
                onPress={() =>
                  ensurePremium(
                    () =>
                      router.push({
                        pathname: "/(home)/pet-journal/briefing",
                        params: { petId: selectedPet.id },
                      } as any),
                    "health_briefing"
                  )
                }
              />
            </View>
          )}

          {/* Pet email (moat) + share with vet */}
          {selectedPet?.email_id ? (
            <PetEmailMoatCard
              petName={selectedPet.name}
              emailLocalPart={selectedPet.email_id}
              onCopy={handleCopyEmail}
              copied={emailCopied}
            />
          ) : null}

          {/* Pet Journal */}
          {selectedPet && (
            <View style={{ marginBottom: 24, paddingHorizontal: 20 }}>
              <PetJournalHomeCard pet={selectedPet} />
            </View>
          )}

          {/* Catch up */}
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

          {/* Body Tracker */}
          {selectedPet && (
            <View style={{ marginBottom: 24 }}>
              <BodyTrackerSection petId={selectedPet.id} />
            </View>
          )}

          {/* Daily walking goal (compact) */}
          {selectedPet && (
            <DailyGoalWalkCard
              variant="compact"
              petName={selectedPet.name}
              onStartWalk={() => router.push("/pawthon-walk")}
            />
          )}

          {/* Weekly Challenge */}
          {SHOW_WEEKLY_CHALLENGE_ON_HOME && selectedPet && (
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <WeeklyChallengeCard
                petName={selectedPet.name}
                weekKm={pawthonStats?.weekKm ?? 0}
                streakDays={pawthonStats?.streak ?? 0}
                walkerRank={weeklyWalkerRank?.rank ?? null}
                walkerTotal={weeklyWalkerRank?.total ?? 0}
                onPress={() =>
                  ensurePremium(() => router.push("/leaderboard" as any), "weekly_challenge")
                }
              />
            </View>
          )}

          {/* Book a vet visit (hidden until re-enabled) */}
          {SHOW_VET_BOOKING_ON_HOME && selectedPet && (
            <View style={{ marginBottom: 24 }}>
              <BookVetVisitSection
                petName={selectedPet.name}
                onSchedule={() =>
                  ensurePremium(() => router.push("/book-vet-visit" as any), "book_vet")
                }
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

    </View>
  );
}
