import { NavigationIconWell } from "@/components/ui/IconWell";
import BottomNavBar from "@/components/home/BottomNavBar";
import { healthRecordTabCanvas } from "@/constants/figmaHealthLayout";
import FailedEmailDetailView from "@/components/messages/FailedEmailDetailView";
import FailedEmailListItem from "@/components/messages/FailedEmailListItem";
import GroupedThreadList from "@/components/messages/GroupedThreadList";
import {
  MESSAGE_CARE_TEAM_SECTION_TITLES,
  MessagesInboxToolbar,
  type MessageCareTeamFilter,
} from "@/components/messages/MessagesInboxToolbar";
import { MESSAGES_INBOX } from "@/components/messages/inboxUiTokens";
import { NewMessageModal } from "@/components/messages/NewMessageModal";
import PendingEmailDetailView from "@/components/messages/PendingEmailDetailView";
import PendingEmailListItem from "@/components/messages/PendingEmailListItem";
import ReviewInboxResolutionModal from "@/components/messages/ReviewInboxResolutionModal";
import ThreadDetailView from "@/components/messages/ThreadDetailView";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { FailedEmail, getReviewInbox, isEmailParsingUpgradeReason } from "@/services/failedEmails";
import { useSubscription } from "@/context/subscriptionContext";
import { fetchMessageThreads, MessageThread } from "@/services/messages";
import {
  GroupedThreads,
  groupThreadsByPet,
  groupThreadsByType,
} from "@/services/messageThreadsGrouped";
import { PendingApprovalWithPet } from "@/services/pendingEmailApprovals";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
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
  View,
} from "react-native";

export default function MessagesScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const pageBg = healthRecordTabCanvas(theme, isDark);
  const queryClient = useQueryClient();
  const { pets } = usePets();
  const { selectedPetId, setSelectedPetId } = useSelectedPet();
  const { pendingApprovals, setCurrentApproval, refreshPendingApprovals } = useEmailApproval();
  const { openPaywall, isAtLeast } = useSubscription();
  const params = useLocalSearchParams<{
    email?: string;
    composeMode?: string;
    composeMessage?: string;
    composeSubject?: string;
    composePetId?: string;
    composeTo?: string;
  }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [initialRecipientEmail, setInitialRecipientEmail] = useState<
    string | undefined
  >();
  const [composeInitialBody, setComposeInitialBody] = useState<string | undefined>();
  const [composeInitialSubject, setComposeInitialSubject] = useState<string | undefined>();
  const [composeMode, setComposeMode] = useState<"care_team" | "support">("care_team");
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
  const [composeInitialPetId, setComposeInitialPetId] = useState<string | undefined>();
  const [resolutionEmail, setResolutionEmail] = useState<FailedEmail | null>(null);

  const displayPetId = selectedPetId ?? pets[0]?.id ?? null;
  const selectedPetForDisplay = pets.find((p) => p.id === displayPetId) ?? null;
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
      setComposeMode(params.composeMode === "support" ? "support" : "care_team");
      setShowNewMessageModal(true);
      router.setParams({ email: undefined, composeMode: undefined });
    }
  }, [params.email, params.composeMode]);

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
      if (params.composeTo) {
        setInitialRecipientEmail(String(params.composeTo));
      }
      setShowNewMessageModal(true);
      router.setParams({
        composeMessage: undefined,
        composeSubject: undefined,
        composePetId: undefined,
        composeTo: undefined,
      });
    }
  }, [params.composeMessage, params.composeSubject, params.composePetId, params.composeTo]);

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

  const emailParsingUpgradeQueue = useMemo(
    () => failedEmails.filter((email) => isEmailParsingUpgradeReason(email.failure_reason)),
    [failedEmails]
  );

  const canParseEmail = isAtLeast("individual");

  const hasEmailParsingUpgradeNotice = useMemo(
    () => emailParsingUpgradeQueue.length > 0 && !canParseEmail,
    [emailParsingUpgradeQueue, canParseEmail]
  );

  const hasEmailParsingReprocessNotice = useMemo(
    () => emailParsingUpgradeQueue.length > 0 && canParseEmail,
    [emailParsingUpgradeQueue, canParseEmail]
  );

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
      <View
        style={{
          paddingHorizontal: MESSAGES_INBOX.paddingH,
          paddingTop: 56,
          paddingBottom: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
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
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 22,
                  color: theme.foreground,
                  marginLeft: 4,
                }}
              >
                Messages
              </Text>
            </Pressable>
          ) : (
            <View>
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 24,
                  color: theme.foreground,
                }}
              >
                Messages
              </Text>
              {totalUnread > 0 && (
                <Text
                  style={{
                    fontFamily: "Poppins_400Regular",
                    fontSize: 13,
                    color: theme.secondary,
                    marginTop: 2,
                  }}
                >
                  {totalUnread} unread
                </Text>
              )}
            </View>
          )}

          {!(selectedThread || selectedPendingApproval || selectedFailedEmail) && (
            <Pressable
              onPress={() => setShowNewMessageModal(true)}
              accessibilityRole="button"
              accessibilityLabel="New message"
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
          )}
        </View>
      </View>

      {!(selectedThread || selectedPendingApproval || selectedFailedEmail) &&
        hasEmailParsingUpgradeNotice && (
          <Pressable
            onPress={() =>
              openPaywall({ source: "email_parsing", requiredPlan: "individual" })
            }
            style={{
              marginHorizontal: MESSAGES_INBOX.paddingH,
              marginBottom: 8,
              padding: 14,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7",
              borderWidth: 1,
              borderColor: isDark ? "rgba(245,158,11,0.35)" : "#FCD34D",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: theme.foreground, marginBottom: 4 }}>
              Email attachments need Individual
            </Text>
            <Text style={{ fontSize: 13, color: theme.secondary, lineHeight: 18 }}>
              We received health documents by email but could not auto-file them on Free. Upgrade to
              Individual to import attachments automatically.
            </Text>
          </Pressable>
        )}

      {!(selectedThread || selectedPendingApproval || selectedFailedEmail) &&
        hasEmailParsingReprocessNotice && (
          <Pressable
            onPress={() => setProcessingErrorsExpanded(true)}
            style={{
              marginHorizontal: MESSAGES_INBOX.paddingH,
              marginBottom: 8,
              padding: 14,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(59,208,210,0.12)" : "#E6F7F6",
              borderWidth: 1,
              borderColor: isDark ? "rgba(59,208,210,0.35)" : "#9DD9D5",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: theme.foreground, marginBottom: 4 }}>
              Health email attachments ready to import
            </Text>
            <Text style={{ fontSize: 13, color: theme.secondary, lineHeight: 18 }}>
              Your plan includes email parsing. Open Processing errors below and reprocess each message
              to import the attachments.
            </Text>
          </Pressable>
        )}

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
          onProcessingFailurePress={(failure) => {
            setResolutionEmail(failure);
          }}
          onRestore={() => {
            refetchThreads();
          }}
          onDeleted={() => {
            refetchThreads();
          }}
        />
      ) : (
        <>
          <MessagesInboxToolbar
            careTeamFilter={careTeamFilter}
            onCareTeamFilterChange={setCareTeamFilter}
            showCareTeamFilters={threadsToGroup.length > 0}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            showSearch={hasMessages}
            pets={pets}
            selectedPetId={selectedPetId ?? pets[0]?.id ?? null}
            onSelectPet={setSelectedPetId}
            showPetFilter={pets.length > 1}
            notificationCounts={messageNotificationCounts}
          />

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
                  <View style={{ marginBottom: 24 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 10,
                        paddingHorizontal: MESSAGES_INBOX.paddingH,
                      }}
                    >
                      <View style={{ marginRight: 8 }}>
                        <NavigationIconWell size="sm" ionIcon="mail-unread-outline" />
                      </View>
                      <Text
                        style={{
                          fontFamily: "Poppins_600SemiBold",
                          fontSize: 16,
                          color: theme.foreground,
                        }}
                      >
                        Requires attention
                      </Text>
                      <View
                        style={{
                          marginLeft: 8,
                          minWidth: 22,
                          height: 22,
                          borderRadius: 11,
                          paddingHorizontal: 6,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: theme.primary,
                        }}
                      >
                        <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 11, color: "#FFFFFF" }}>
                          {pendingForDisplay.length}
                        </Text>
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
                    title={MESSAGE_CARE_TEAM_SECTION_TITLES.veterinarian}
                    icon="stethoscope"
                    iconType="material"
                    onThreadPress={handleThreadPress}
                  />
                )}
                {showThreadGroup("dog_walker") && (
                  <GroupedThreadList
                    threads={filteredGroupedThreads.dog_walker}
                    category="dog_walker"
                    title={MESSAGE_CARE_TEAM_SECTION_TITLES.dog_walker}
                    icon="walk"
                    iconType="material"
                    onThreadPress={handleThreadPress}
                  />
                )}
                {showThreadGroup("groomer") && (
                  <GroupedThreadList
                    threads={filteredGroupedThreads.groomer}
                    category="groomer"
                    title={MESSAGE_CARE_TEAM_SECTION_TITLES.groomer}
                    icon="content-cut"
                    iconType="material"
                    onThreadPress={handleThreadPress}
                  />
                )}
                {showThreadGroup("pet_sitter") && (
                  <GroupedThreadList
                    threads={filteredGroupedThreads.pet_sitter}
                    category="pet_sitter"
                    title={MESSAGE_CARE_TEAM_SECTION_TITLES.pet_sitter}
                    icon="heart-outline"
                    iconType="material"
                    onThreadPress={handleThreadPress}
                  />
                )}
                {showThreadGroup("boarding") && (
                  <GroupedThreadList
                    threads={filteredGroupedThreads.boarding}
                    category="boarding"
                    title={MESSAGE_CARE_TEAM_SECTION_TITLES.boarding}
                    icon="home-city-outline"
                    iconType="material"
                    onThreadPress={handleThreadPress}
                  />
                )}
                {showThreadGroup("unknown") &&
                  filteredGroupedThreads.unknown.length > 0 && (
                    <GroupedThreadList
                      threads={filteredGroupedThreads.unknown}
                      category="veterinarian"
                      title={MESSAGE_CARE_TEAM_SECTION_TITLES.unknown}
                      icon="email-outline"
                      iconType="ionicons"
                      onThreadPress={handleThreadPress}
                    />
                  )}

                {threadsToGroup.length > 0 &&
                  careTeamFilter !== "all" &&
                  filteredInboxThreadCount === 0 && (
                    <View
                      style={{
                        paddingHorizontal: MESSAGES_INBOX.paddingH,
                        paddingVertical: 32,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Poppins_600SemiBold",
                          fontSize: 16,
                          color: theme.foreground,
                          textAlign: "center",
                        }}
                      >
                        No conversations in this category
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Poppins_400Regular",
                          fontSize: 14,
                          color: theme.secondary,
                          textAlign: "center",
                          marginTop: 8,
                          maxWidth: 300,
                          lineHeight: 20,
                        }}
                      >
                        Try &quot;All&quot; to see every care team thread, or pick another filter.
                      </Text>
                    </View>
                  )}

                {failedForDisplay.length > 0 ? (
                  <View style={{ marginBottom: 24, paddingHorizontal: MESSAGES_INBOX.paddingH }}>
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
                          style={{
                            fontFamily: "Poppins_600SemiBold",
                            fontSize: 16,
                            color: theme.foreground,
                            flexShrink: 1,
                          }}
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
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 80,
                      paddingHorizontal: MESSAGES_INBOX.paddingH,
                    }}
                  >
                    <Image
                      source={require("@/assets/icons/no-message.png")}
                      style={{ width: 140, height: 140, marginBottom: 20 }}
                      resizeMode="contain"
                    />
                    <Text
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        fontSize: 22,
                        color: theme.foreground,
                        textAlign: "center",
                        marginBottom: 8,
                      }}
                    >
                      No messages
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Poppins_400Regular",
                        fontSize: 15,
                        color: theme.secondary,
                        textAlign: "center",
                        lineHeight: 22,
                      }}
                    >
                      {selectedPetForDisplay
                        ? `No messages for ${selectedPetForDisplay.name} yet.${pets.length > 1 ? " Switch pets above to check other inboxes." : ""}`
                        : "All messages from your pet's care providers will appear here."}
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
          setComposeMode("care_team");
        }}
        composeMode={composeMode}
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
          void queryClient.invalidateQueries({
            queryKey: ["threadAttachmentFailures"],
          });
        }}
      />
    </View>
  );
}
