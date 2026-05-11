import BottomNavBar from "@/components/home/BottomNavBar";
import PetSelector from "@/components/home/PetSelector";
import { healthRecordTabCanvas } from "@/constants/figmaHealthLayout";
import FailedEmailDetailView from "@/components/messages/FailedEmailDetailView";
import FailedEmailListItem from "@/components/messages/FailedEmailListItem";
import ReviewInboxResolutionModal from "@/components/messages/ReviewInboxResolutionModal";
import GroupedThreadList from "@/components/messages/GroupedThreadList";
import { NewMessageModal } from "@/components/messages/NewMessageModal";
import PendingEmailDetailView from "@/components/messages/PendingEmailDetailView";
import PendingEmailListItem from "@/components/messages/PendingEmailListItem";
import ThreadDetailView from "@/components/messages/ThreadDetailView";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { FailedEmail, getReviewInbox } from "@/services/failedEmails";
import { fetchMessageThreads, MessageThread } from "@/services/messages";
import type { CareTeamMemberType } from "@/services/careTeamMembers";
import {
  GroupedThreads,
  groupThreadsByPet,
  groupThreadsByType,
} from "@/services/messageThreadsGrouped";
import { PendingApprovalWithPet } from "@/services/pendingEmailApprovals";
import { supabase } from "@/utils/supabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

/** Inbox list filter: all care types, or a single `GroupedThreads` bucket */
type MessageCareTeamFilter = "all" | CareTeamMemberType;

const MESSAGE_CARE_TEAM_FILTERS: {
  id: MessageCareTeamFilter;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { id: "all", label: "All", icon: "view-grid-outline" },
  { id: "veterinarian", label: "Vet", icon: "stethoscope" },
  { id: "dog_walker", label: "Walker", icon: "walk" },
  { id: "boarding", label: "Boarder", icon: "home-city-outline" },
  { id: "groomer", label: "Groomer", icon: "content-cut" },
  { id: "pet_sitter", label: "Sitter", icon: "heart-outline" },
  { id: "unknown", label: "Other", icon: "email-outline" },
];

export default function MessagesScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const pageBg = healthRecordTabCanvas(theme, isDark);
  const queryClient = useQueryClient();
  const { pets } = usePets();
  const { selectedPetId, setSelectedPetId } = useSelectedPet();
  const { pendingApprovals, setCurrentApproval, refreshPendingApprovals } = useEmailApproval();
  const params = useLocalSearchParams<{
    email?: string;
    composeMessage?: string;
    composeSubject?: string;
    composePetId?: string;
  }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [initialRecipientEmail, setInitialRecipientEmail] = useState<
    string | undefined
  >();
  const [composeInitialBody, setComposeInitialBody] = useState<string | undefined>();
  const [composeInitialSubject, setComposeInitialSubject] = useState<string | undefined>();
  const [composeInitialPetId, setComposeInitialPetId] = useState<string | undefined>();
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(
    null
  );
  const [selectedPendingApproval, setSelectedPendingApproval] =
    useState<PendingApprovalWithPet | null>(null);
  const [selectedFailedEmail, setSelectedFailedEmail] =
    useState<FailedEmail | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [careTeamFilter, setCareTeamFilter] =
    useState<MessageCareTeamFilter>("all");
  const [resolutionEmail, setResolutionEmail] = useState<FailedEmail | null>(null);
  const [processingErrorsExpanded, setProcessingErrorsExpanded] = useState(false);

  // Fetch message threads
  const {
    data: threads = [],
    isLoading: loadingThreads,
    refetch: refetchThreads,
  } = useQuery({
    queryKey: ["messageThreads"],
    queryFn: () => fetchMessageThreads(),
  });

  // Review Inbox (processed_emails need manual sort)
  const {
    data: failedEmails = [],
    refetch: refetchFailedEmails,
  } = useQuery({
    queryKey: ["reviewInbox"],
    queryFn: () => getReviewInbox(),
  });

  // Handle route params to open new message modal with pre-filled email
  React.useEffect(() => {
    if (params.email) {
      setInitialRecipientEmail(params.email);
      setShowNewMessageModal(true);
      // Clear the param to avoid re-opening on navigation
      router.setParams({ email: undefined });
    }
  }, [params.email]);

  React.useEffect(() => {
    if (params.composeMessage) {
      try {
        setComposeInitialBody(decodeURIComponent(String(params.composeMessage)));
      } catch {
        setComposeInitialBody(String(params.composeMessage));
      }
      if (params.composeSubject) {
        try {
          setComposeInitialSubject(decodeURIComponent(String(params.composeSubject)));
        } catch {
          setComposeInitialSubject(String(params.composeSubject));
        }
      } else {
        setComposeInitialSubject(undefined);
      }
      if (params.composePetId) {
        setComposeInitialPetId(String(params.composePetId));
      }
      setShowNewMessageModal(true);
      router.setParams({
        composeMessage: undefined,
        composeSubject: undefined,
        composePetId: undefined,
      });
    }
  }, [params.composeMessage, params.composeSubject, params.composePetId]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchThreads(),
      refreshPendingApprovals(),
      refetchFailedEmails(),
    ]);
    setRefreshing(false);
  };

  // Filter threads based on search query
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) {
      return threads;
    }

    const query = searchQuery.toLowerCase();
    return threads.filter(
      (thread) =>
        thread.recipient_name?.toLowerCase().includes(query) ||
        thread.recipient_email.toLowerCase().includes(query) ||
        thread.subject.toLowerCase().includes(query) ||
        thread.pets?.name?.toLowerCase().includes(query) ||
        thread.last_message?.body.toLowerCase().includes(query)
    );
  }, [threads, searchQuery]);

  // Filter pending approvals by search query
  const filteredPendingApprovals = useMemo(() => {
    if (!searchQuery.trim()) {
      return pendingApprovals;
    }

    const query = searchQuery.toLowerCase();
    return pendingApprovals.filter(
      (approval) =>
        approval.sender_email?.toLowerCase().includes(query) ||
        approval.pets?.name?.toLowerCase().includes(query) ||
        approval.document_type?.toLowerCase().includes(query)
    );
  }, [pendingApprovals, searchQuery]);

  // Filter failed emails by search query
  const filteredFailedEmails = useMemo(() => {
    if (!searchQuery.trim()) {
      return failedEmails;
    }

    const query = searchQuery.toLowerCase();
    return failedEmails.filter(
      (email) =>
        email.sender_email?.toLowerCase().includes(query) ||
        email.pets?.name?.toLowerCase().includes(query) ||
        email.subject?.toLowerCase().includes(query) ||
        email.failure_reason?.toLowerCase().includes(query)
    );
  }, [failedEmails, searchQuery]);

  // Get total unread count
  const totalUnread = useMemo(() => {
    const threadUnreadCount = threads.reduce(
      (sum, thread) => sum + (thread.unread_count || 0),
      0
    );
    return threadUnreadCount + pendingApprovals.length;
  }, [threads, pendingApprovals]);

  // Group by pet (for pet selector notification counts when multi-pet)
  const groupedByPet = useMemo(
    () => groupThreadsByPet(filteredThreads),
    [filteredThreads]
  );

  // When multi-pet: show only selected pet's threads (grouped by type). When single-pet: show all.
  const threadsToGroup = useMemo(() => {
    if (pets.length <= 1) return filteredThreads;
    const effectivePetId = selectedPetId ?? pets[0]?.id;
    if (!effectivePetId) return filteredThreads;
    return filteredThreads.filter((t) => t.pet_id === effectivePetId);
  }, [filteredThreads, pets.length, selectedPetId, pets]);

  // Per-pet notification counts for PetSelector (unread threads + pending approvals)
  const messageNotificationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pendingApprovals.forEach((a) => {
      if (a.pet_id) counts[a.pet_id] = (counts[a.pet_id] ?? 0) + 1;
    });
    Object.entries(groupedByPet).forEach(([petId, list]) => {
      if (petId !== "unknown") {
        const unread = list.reduce((s, t) => s + (t.unread_count ?? 0), 0);
        counts[petId] = (counts[petId] ?? 0) + unread;
      }
    });
    return counts;
  }, [pendingApprovals, groupedByPet]);

  // Group threads by care team type (input is threadsToGroup: selected pet when multi-pet, else all)
  const [filteredGroupedThreads, setFilteredGroupedThreads] =
    React.useState<GroupedThreads>({
      veterinarian: [],
      dog_walker: [],
      groomer: [],
      pet_sitter: [],
      boarding: [],
      unknown: [],
    });

  // Track the last processed threads to avoid infinite loops
  const lastProcessedThreadsRef = React.useRef<string>("");

  // Group threads by care team type (uses threadsToGroup: selected pet when multi-pet, else all)
  React.useEffect(() => {
    const threadsKey = threadsToGroup
      .map((t) => `${t.id}:${t.unread_count ?? 0}:${t.updated_at}`)
      .sort()
      .join(",");

    if (threadsKey === lastProcessedThreadsRef.current) return;
    if (loadingThreads) return;

    if (threadsToGroup.length === 0) {
      lastProcessedThreadsRef.current = threadsKey;
      setFilteredGroupedThreads({
        veterinarian: [],
        dog_walker: [],
        groomer: [],
        pet_sitter: [],
        boarding: [],
        unknown: [],
      });
      return;
    }

    lastProcessedThreadsRef.current = threadsKey;
    const groupFilteredThreads = async () => {
      const grouped = await groupThreadsByType(threadsToGroup);
      setFilteredGroupedThreads(grouped);
    };
    groupFilteredThreads();
  }, [threadsToGroup, loadingThreads]);

  // Handle thread press
  const handleThreadPress = (thread: MessageThread) => {
    setSelectedThread(thread);
  };

  // Handle pending approval press
  const handlePendingApprovalPress = (approval: PendingApprovalWithPet) => {
    // Set the current approval in context (needed for the handlers)
    setCurrentApproval(approval);
    // Set local state to show detail view
    setSelectedPendingApproval(approval);
  };

  // Handle back from pending approval detail view
  const handlePendingApprovalBack = () => {
    setSelectedPendingApproval(null);
  };

  // Open Review Inbox resolution modal (reprocess with pet + doc type)
  const handleFailedEmailPress = (failedEmail: FailedEmail) => {
    setResolutionEmail(failedEmail);
  };

  // Handle back from failed email detail view
  const handleFailedEmailBack = () => {
    setSelectedFailedEmail(null);
  };

  // When multi-pet, show pending/failed for selected pet only
  const effectivePetId = pets.length > 1 ? (selectedPetId ?? pets[0]?.id) : null;
  const pendingForDisplay = useMemo(
    () =>
      effectivePetId
        ? filteredPendingApprovals.filter((a) => a.pet_id === effectivePetId)
        : filteredPendingApprovals,
    [filteredPendingApprovals, effectivePetId]
  );
  const failedForDisplay = useMemo(
    () =>
      effectivePetId
        ? filteredFailedEmails.filter((e) => e.pet_id === effectivePetId)
        : filteredFailedEmails,
    [filteredFailedEmails, effectivePetId]
  );

  const hasMessages =
    threadsToGroup.length > 0 ||
    pendingForDisplay.length > 0 ||
    failedForDisplay.length > 0;

  const showThreadGroup = (bucket: keyof GroupedThreads) =>
    careTeamFilter === "all" || careTeamFilter === bucket;

  const filteredInboxThreadCount =
    careTeamFilter === "all"
      ? threadsToGroup.length
      : filteredGroupedThreads[careTeamFilter].length;

  return (
    <View className="flex-1" style={{ backgroundColor: pageBg }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          {/* Left: Back or Title */}
          {selectedThread || selectedPendingApproval || selectedFailedEmail ? (
            <Pressable
              onPress={() => {
                if (selectedThread) setSelectedThread(null);
                else if (selectedPendingApproval) setSelectedPendingApproval(null);
                else if (selectedFailedEmail) setSelectedFailedEmail(null);
              }}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Ionicons name="chevron-back" size={24} color={theme.foreground} />
              <Text style={{ fontSize: 22, fontWeight: "700", color: theme.foreground, marginLeft: 4 }}>
                Messages
              </Text>
            </Pressable>
          ) : (
            <View>
              <Text style={{ fontSize: 24, fontWeight: "700", color: theme.foreground }}>
                Messages
              </Text>
              {totalUnread > 0 && (
                <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 2 }}>
                  {totalUnread} unread
                </Text>
              )}
            </View>
          )}

          {/* Right: Action buttons */}
          {!(selectedThread || selectedPendingApproval || selectedFailedEmail) && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                onPress={() => setShowNewMessageModal(true)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                }}
              >
                <Ionicons name="add" size={22} color={theme.foreground} />
              </Pressable>
              <Pressable
                onPress={() => setSearchQuery(searchQuery ? "" : " ")}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                }}
              >
                <Ionicons name="search-outline" size={20} color={theme.foreground} />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Failed Email Detail View */}
      {selectedFailedEmail ? (
        <FailedEmailDetailView
          failedEmail={selectedFailedEmail}
          onBack={handleFailedEmailBack}
          hideHeader
          onDeleted={() => {
            refetchFailedEmails();
          }}
        />
      ) : /* Pending Email Detail View */
      selectedPendingApproval ? (
        <PendingEmailDetailView
          approval={selectedPendingApproval}
          onBack={handlePendingApprovalBack}
          hideHeader
        />
      ) : /* Thread Detail View */
      selectedThread ? (
        <ThreadDetailView
          threadId={selectedThread.id}
          thread={selectedThread}
          onBack={() => setSelectedThread(null)}
          hideHeader
          isTrash={false}
          onRestore={() => {
            refetchThreads();
          }}
          onDeleted={() => {
            refetchThreads();
          }}
        />
      ) : (
        <>
          {/* Care team filter — only when there are threads to filter */}
          {threadsToGroup.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, flexShrink: 0 }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 4,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {MESSAGE_CARE_TEAM_FILTERS.map((f, index) => {
                const selected = careTeamFilter === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setCareTeamFilter(f.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: selected ? theme.primary : theme.card,
                      marginRight: index < MESSAGE_CARE_TEAM_FILTERS.length - 1 ? 8 : 0,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={f.icon}
                      size={18}
                      color={selected ? "#FFFFFF" : theme.secondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: selected ? "#FFFFFF" : theme.foreground,
                      }}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Search Bar - only when there are messages */}
          {hasMessages && (
          <View className="px-4" style={{ paddingTop: 4, paddingBottom: 10 }}>
            <View
              className="flex-row items-center px-4 py-3 rounded-2xl"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={theme.secondary}
                style={{ marginRight: 8 }}
              />
              <TextInput
                className="flex-1"
                style={{ color: theme.foreground }}
                placeholder="Search conversations..."
                placeholderTextColor={theme.secondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
          )}

          {/* Pet Selector (when user has more than one pet and has messages) */}
          {pets.length > 1 && hasMessages && (
            <View className="mb-4 px-2">
              <PetSelector
                pets={pets}
                selectedPetId={selectedPetId ?? pets[0]?.id ?? null}
                onSelectPet={setSelectedPetId}
                notificationCounts={messageNotificationCounts}
              />
            </View>
          )}

          {/* Messages List */}
          <ScrollView
            className="flex-1"
            style={{ flex: 1, backgroundColor: pageBg }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
          >
            {loadingThreads ? (
              <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : (
              <>
                {/* Pending Emails Section */}
                {pendingForDisplay.length > 0 && (
                  <View className="mb-6">
                    <View className="flex-row items-center justify-between mb-3 px-4">
                      <View className="flex-row items-center flex-1">
                        <Ionicons
                          name="mail-unread"
                          size={20}
                          color={theme.primary}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          className="text-base font-bold"
                          style={{ color: theme.foreground }}
                        >
                          Requires Attention
                        </Text>
                        <View
                          className="ml-2 px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: theme.primary }}
                        >
                          <Text className="text-xs font-bold text-white">
                            {pendingForDisplay.length}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View>
                      {pendingForDisplay.map((approval) => (
                        <PendingEmailListItem
                          key={approval.id}
                          approval={approval}
                          onPress={() => handlePendingApprovalPress(approval)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Grouped thread sections — gated by care team filter */}
                {showThreadGroup("veterinarian") && (
                  <GroupedThreadList
                    threads={filteredGroupedThreads.veterinarian}
                    category="veterinarian"
                    title="Veterinarians"
                    icon="stethoscope"
                    iconType="material"
                    color="#60A5FA"
                    onThreadPress={handleThreadPress}
                  />
                )}
                {showThreadGroup("dog_walker") && (
                  <GroupedThreadList
                    threads={filteredGroupedThreads.dog_walker}
                    category="dog_walker"
                    title="Dog Walkers"
                    icon="paw"
                    iconType="material"
                    color="#4ADE80"
                    onThreadPress={handleThreadPress}
                  />
                )}
                {showThreadGroup("groomer") && (
                  <GroupedThreadList
                    threads={filteredGroupedThreads.groomer}
                    category="groomer"
                    title="Groomers"
                    icon="content-cut"
                    iconType="material"
                    color="#A78BFA"
                    onThreadPress={handleThreadPress}
                  />
                )}
                {showThreadGroup("pet_sitter") && (
                  <GroupedThreadList
                    threads={filteredGroupedThreads.pet_sitter}
                    category="pet_sitter"
                    title="Pet Sitters"
                    icon="heart"
                    iconType="material"
                    color="#F472B6"
                    onThreadPress={handleThreadPress}
                  />
                )}
                {showThreadGroup("boarding") && (
                  <GroupedThreadList
                    threads={filteredGroupedThreads.boarding}
                    category="boarding"
                    title="Boarding"
                    icon="home"
                    iconType="material"
                    color="#D97706"
                    onThreadPress={handleThreadPress}
                  />
                )}
                {showThreadGroup("unknown") &&
                  filteredGroupedThreads.unknown.length > 0 && (
                    <GroupedThreadList
                      threads={filteredGroupedThreads.unknown}
                      category="veterinarian"
                      title="Other"
                      icon="mail-outline"
                      iconType="ionicons"
                      color="#9CA3AF"
                      onThreadPress={handleThreadPress}
                    />
                  )}

                {threadsToGroup.length > 0 &&
                  careTeamFilter !== "all" &&
                  filteredInboxThreadCount === 0 && (
                    <View className="px-4 py-8 items-center">
                      <Text
                        className="text-base text-center font-semibold"
                        style={{ color: theme.foreground }}
                      >
                        No conversations in this category
                      </Text>
                      <Text
                        className="text-sm text-center mt-2"
                        style={{ color: theme.secondary, maxWidth: 300 }}
                      >
                        Try &quot;All&quot; to see every care team thread, or pick another
                        filter.
                      </Text>
                    </View>
                  )}

                {/* Document processing failures — secondary, collapsed by default */}
                {failedForDisplay.length > 0 ? (
                  <View className="mb-6 px-4">
                    <Pressable
                      onPress={() => setProcessingErrorsExpanded((e) => !e)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: processingErrorsExpanded }}
                      accessibilityLabel={`Processing errors, ${failedForDisplay.length} items. ${
                        processingErrorsExpanded ? "Collapse" : "Expand"
                      }`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 10,
                        paddingHorizontal: 4,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
                        <Ionicons
                          name="alert-circle-outline"
                          size={20}
                          color={theme.warning}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          className="text-base font-semibold"
                          style={{ color: theme.foreground, flexShrink: 1 }}
                          numberOfLines={1}
                        >
                          {`Processing errors (${failedForDisplay.length})`}
                        </Text>
                      </View>
                      <Ionicons
                        name={processingErrorsExpanded ? "chevron-up" : "chevron-down"}
                        size={22}
                        color={theme.secondary}
                        style={{ marginLeft: 8 }}
                      />
                    </Pressable>

                    {processingErrorsExpanded ? (
                      <View>
                        {failedForDisplay.map((failedEmail) => (
                          <FailedEmailListItem
                            key={failedEmail.id}
                            failedEmail={failedEmail}
                            onPress={() => handleFailedEmailPress(failedEmail)}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Empty State */}
                {!hasMessages && (
                  <View className="flex-1 items-center justify-center py-20 px-4">
                    <Image
                      source={require("@/assets/icons/no-message.png")}
                      style={{ width: 140, height: 140, marginBottom: 20 }}
                      resizeMode="contain"
                    />
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "700",
                        color: theme.foreground,
                        textAlign: "center",
                        marginBottom: 8,
                      }}
                    >
                      No Messages
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        color: theme.secondary,
                        textAlign: "center",
                        lineHeight: 22,
                        paddingHorizontal: 20,
                      }}
                    >
                      All messages from your pet's care{"\n"}providers will appear here.
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </>
      )}

      {/* Bottom Navigation */}
      <BottomNavBar activeTab="messages" />

      {/* New Message Modal */}
      <NewMessageModal
        visible={showNewMessageModal}
        onClose={() => {
          setShowNewMessageModal(false);
          setInitialRecipientEmail(undefined);
          setComposeInitialBody(undefined);
          setComposeInitialSubject(undefined);
          setComposeInitialPetId(undefined);
        }}
        initialRecipientEmail={initialRecipientEmail}
        initialMessageBody={composeInitialBody}
        initialSubject={composeInitialSubject}
        initialPetId={composeInitialPetId}
        onSend={async (messageData) => {
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (!session) {
              Alert.alert("Error", "You must be logged in to send messages");
              return;
            }

            const { error } = await supabase.functions.invoke("send-message", {
              body: messageData,
            });

            if (error) {
              throw error;
            }

            Alert.alert("Success", "Message sent successfully!");
            setShowNewMessageModal(false);

            // Refresh threads
            queryClient.invalidateQueries({ queryKey: ["messageThreads"] });
          } catch (error) {
            console.error("Error sending message:", error);
            Alert.alert(
              "Error",
              error instanceof Error
                ? error.message
                : "Failed to send message. Please try again."
            );
          }
        }}
      />

      <ReviewInboxResolutionModal
        visible={resolutionEmail != null}
        item={resolutionEmail}
        onClose={() => setResolutionEmail(null)}
        onViewDetails={() => {
          if (resolutionEmail) {
            setSelectedFailedEmail(resolutionEmail);
            setResolutionEmail(null);
          }
        }}
        onResolved={(petName, docLabel) => {
          Alert.alert("Record filed!", `${petName}'s ${docLabel} has been updated.`);
          void queryClient.invalidateQueries({ queryKey: ["reviewInbox"] });
          void queryClient.invalidateQueries({ queryKey: ["messageThreads"] });
        }}
      />
    </View>
  );
}
