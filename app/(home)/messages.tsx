import BottomNavBar from "@/components/home/BottomNavBar";
import GroupedThreadList from "@/components/messages/GroupedThreadList";
import FailedEmailDetailView from "@/components/messages/FailedEmailDetailView";
import FailedEmailListItem from "@/components/messages/FailedEmailListItem";
import { NewMessageModal } from "@/components/messages/NewMessageModal";
import PendingEmailDetailView from "@/components/messages/PendingEmailDetailView";
import PendingEmailListItem from "@/components/messages/PendingEmailListItem";
import ThreadDetailView from "@/components/messages/ThreadDetailView";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { useTheme } from "@/context/themeContext";
import { FailedEmail, getFailedEmails } from "@/services/failedEmails";
import { fetchMessageThreads, MessageThread } from "@/services/messages";
import {
  GroupedThreads,
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
  TextInput,
  View,
} from "react-native";

export default function MessagesScreen() {
  const { theme, mode } = useTheme();
  const queryClient = useQueryClient();
  const { pendingApprovals, setCurrentApproval, refreshPendingApprovals } = useEmailApproval();
  const params = useLocalSearchParams<{ email?: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [initialRecipientEmail, setInitialRecipientEmail] = useState<
    string | undefined
  >();
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(
    null
  );
  const [selectedPendingApproval, setSelectedPendingApproval] =
    useState<PendingApprovalWithPet | null>(null);
  const [selectedFailedEmail, setSelectedFailedEmail] =
    useState<FailedEmail | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch message threads
  const {
    data: threads = [],
    isLoading: loadingThreads,
    refetch: refetchThreads,
  } = useQuery({
    queryKey: ["messageThreads"],
    queryFn: () => fetchMessageThreads(),
  });

  // Fetch failed emails
  const {
    data: failedEmails = [],
    refetch: refetchFailedEmails,
  } = useQuery({
    queryKey: ["failedEmails"],
    queryFn: () => getFailedEmails(),
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

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchThreads(), refreshPendingApprovals(), refetchFailedEmails()]);
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

  // Group filtered threads
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

  // Group filtered threads - must be before any early returns (Rules of Hooks)
  React.useEffect(() => {
    // Create a stable key from thread IDs and unread counts to detect changes
    const threadsKey = filteredThreads
      .map((t) => `${t.id}:${t.unread_count ?? 0}:${t.updated_at}`)
      .sort()
      .join(",");

    // Skip if we've already processed these exact threads
    if (threadsKey === lastProcessedThreadsRef.current) {
      return;
    }

    // Skip grouping while loading
    if (loadingThreads) {
      return;
    }

    // Handle empty threads
    if (filteredThreads.length === 0) {
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

    // Mark as processing
    lastProcessedThreadsRef.current = threadsKey;

    const groupFilteredThreads = async () => {
      const grouped = await groupThreadsByType(filteredThreads);
      setFilteredGroupedThreads(grouped);
    };
    groupFilteredThreads();
  }, [filteredThreads, loadingThreads]);

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

  // Handle failed email press
  const handleFailedEmailPress = (failedEmail: FailedEmail) => {
    setSelectedFailedEmail(failedEmail);
  };

  // Handle back from failed email detail view
  const handleFailedEmailBack = () => {
    setSelectedFailedEmail(null);
  };

  const hasMessages =
    filteredThreads.length > 0 || filteredPendingApprovals.length > 0 || filteredFailedEmails.length > 0;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      {/* Header */}
      <View className="px-6 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          {/* Back Button - Pawbuck Logo */}
          <Pressable
            onPress={() => {
              if (selectedThread) {
                setSelectedThread(null);
              } else if (selectedPendingApproval) {
                setSelectedPendingApproval(null);
              } else if (selectedFailedEmail) {
                setSelectedFailedEmail(null);
              } else {
                router.back();
              }
            }}
            className="items-center justify-center active:opacity-70"
          >
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </Pressable>

          {/* Title */}
          <View className="items-center">
            <Text
              className="text-xl font-bold"
              style={{ color: theme.foreground }}
            >
              Messages
            </Text>
            {totalUnread > 0 && !selectedThread && !selectedPendingApproval && !selectedFailedEmail && (
              <Text
                className="text-sm mt-0.5"
                style={{ color: theme.secondary }}
              >
                {totalUnread} unread
              </Text>
            )}
          </View>

          {/* Add Button - Hidden when viewing thread, pending approval, or failed email */}
          {selectedThread || selectedPendingApproval || selectedFailedEmail ? (
            <View className="w-10 h-10" />
          ) : (
            <Pressable
              onPress={() => setShowNewMessageModal(true)}
              className="w-10 h-10 items-center justify-center active:opacity-70"
            >
              <Ionicons name="add-circle" size={28} color={theme.primary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Failed Email Detail View */}
      {selectedFailedEmail ? (
        <FailedEmailDetailView
          failedEmail={selectedFailedEmail}
          onBack={handleFailedEmailBack}
          hideHeader
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
        />
      ) : (
        <>
          {/* Search Bar */}
          <View className="px-4 pb-4">
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

          {/* Messages List */}
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
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
                {filteredPendingApprovals.length > 0 && (
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
                            {filteredPendingApprovals.length}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View>
                      {filteredPendingApprovals.map((approval) => (
                        <PendingEmailListItem
                          key={approval.id}
                          approval={approval}
                          onPress={() => handlePendingApprovalPress(approval)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Grouped Thread Sections */}
                <GroupedThreadList
                  threads={filteredGroupedThreads.veterinarian}
                  category="veterinarian"
                  title="Veterinarians"
                  icon="stethoscope"
                  iconType="material"
                  color="#60A5FA"
                  onThreadPress={handleThreadPress}
                />
                <GroupedThreadList
                  threads={filteredGroupedThreads.dog_walker}
                  category="dog_walker"
                  title="Dog Walkers"
                  icon="paw"
                  iconType="material"
                  color="#4ADE80"
                  onThreadPress={handleThreadPress}
                />
                <GroupedThreadList
                  threads={filteredGroupedThreads.groomer}
                  category="groomer"
                  title="Groomers"
                  icon="content-cut"
                  iconType="material"
                  color="#A78BFA"
                  onThreadPress={handleThreadPress}
                />
                <GroupedThreadList
                  threads={filteredGroupedThreads.pet_sitter}
                  category="pet_sitter"
                  title="Pet Sitters"
                  icon="heart"
                  iconType="material"
                  color="#F472B6"
                  onThreadPress={handleThreadPress}
                />
                <GroupedThreadList
                  threads={filteredGroupedThreads.boarding}
                  category="boarding"
                  title="Boarding"
                  icon="home"
                  iconType="material"
                  color="#D97706"
                  onThreadPress={handleThreadPress}
                />
                {/* Show unknown threads if any */}
                {filteredGroupedThreads.unknown.length > 0 && (
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

                {/* Failed Emails Section - shown at the bottom */}
                {filteredFailedEmails.length > 0 && (
                  <View className="mb-6">
                    <View className="flex-row items-center justify-between mb-3 px-4">
                      <View className="flex-row items-center flex-1">
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#EF4444"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          className="text-base font-bold"
                          style={{ color: theme.foreground }}
                        >
                          Failed Emails
                        </Text>
                        <View
                          className="ml-2 px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "#EF4444" }}
                        >
                          <Text className="text-xs font-bold text-white">
                            {filteredFailedEmails.length}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View>
                      {filteredFailedEmails.map((failedEmail) => (
                        <FailedEmailListItem
                          key={failedEmail.id}
                          failedEmail={failedEmail}
                          onPress={() => handleFailedEmailPress(failedEmail)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Empty State */}
                {!hasMessages && (
                  <View className="flex-1 items-center justify-center py-20 px-4">
                    <View
                      className="w-20 h-20 rounded-full items-center justify-center mb-4"
                      style={{ backgroundColor: `${theme.primary}15` }}
                    >
                      <Ionicons
                        name="mail-outline"
                        size={40}
                        color={theme.primary}
                      />
                    </View>
                    <Text
                      className="text-xl font-bold text-center mb-2"
                      style={{ color: theme.foreground }}
                    >
                      No Messages
                    </Text>
                    <Text
                      className="text-base text-center"
                      style={{ color: theme.secondary }}
                    >
                      Your messages from vets and care providers will appear
                      here
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
        }}
        initialRecipientEmail={initialRecipientEmail}
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
    </View>
  );
}
