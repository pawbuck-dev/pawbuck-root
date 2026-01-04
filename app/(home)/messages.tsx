import { EmailApprovalModal } from "@/components/email-approval/EmailApprovalModal";
import BottomNavBar from "@/components/home/BottomNavBar";
import HomeHeader from "@/components/home/HomeHeader";
import GroupedThreadList from "@/components/messages/GroupedThreadList";
import MessageListItem from "@/components/messages/MessageListItem";
import { NewMessageModal } from "@/components/messages/NewMessageModal";
import ThreadDetailView from "@/components/messages/ThreadDetailView";
import { ChatProvider } from "@/context/chatContext";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { TablesInsert } from "@/database.types";
import { linkCareTeamMemberToPet } from "@/services/careTeamMembers";
import { fetchMessageThreads, MessageThread } from "@/services/messages";
import { GroupedThreads, groupThreadsByType } from "@/services/messageThreadsGrouped";
import { PendingApprovalWithPet } from "@/services/pendingEmailApprovals";
import { CareTeamMemberType, createVetInformation } from "@/services/vetInformation";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type FilterType = "all" | string; // "all" or pet ID

export default function MessagesScreen() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { pendingApprovals, setCurrentApproval } = useEmailApproval();
  const { pets } = usePets();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [threadToAdd, setThreadToAdd] = useState<MessageThread | null>(null);
  const [selectedMemberType, setSelectedMemberType] = useState<CareTeamMemberType>("veterinarian");

  // Fetch message threads
  const {
    data: threads = [],
    isLoading: loadingThreads,
    refetch: refetchThreads,
  } = useQuery({
    queryKey: ["messageThreads"],
    queryFn: () => fetchMessageThreads(),
  });

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchThreads()]);
    setRefreshing(false);
  };

  // Filter threads based on search query and pet filter
  const filteredThreads = useMemo(() => {
    let filtered = threads;

    // Filter by selected pet
    if (selectedFilter !== "all") {
      filtered = filtered.filter((thread) => thread.pet_id === selectedFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (thread) =>
          thread.recipient_name?.toLowerCase().includes(query) ||
          thread.recipient_email.toLowerCase().includes(query) ||
          thread.subject.toLowerCase().includes(query) ||
          thread.pets?.name?.toLowerCase().includes(query) ||
          thread.last_message?.body.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [threads, selectedFilter, searchQuery]);

  // Filter pending approvals by selected pet and search query
  const filteredPendingApprovals = useMemo(() => {
    let filtered = pendingApprovals;

    // Filter by selected pet
    if (selectedFilter !== "all") {
      filtered = filtered.filter((approval) => approval.pet_id === selectedFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (approval) =>
          approval.sender_email?.toLowerCase().includes(query) ||
          approval.pets?.name?.toLowerCase().includes(query) ||
          approval.document_type?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [pendingApprovals, selectedFilter, searchQuery]);

  // Get "needs_review" messages (validation_status === "incorrect")
  const needsReviewMessages = useMemo(() => {
    return filteredPendingApprovals.filter(
      (approval) => approval.validation_status === "incorrect"
    );
  }, [filteredPendingApprovals]);

  // Get unread count for each filter (threads + pending approvals)
  const getUnreadCountForFilter = (filterId: FilterType): number => {
    let count = 0;

    // Count threads for this filter
    const filteredThreadsForPet =
      filterId === "all" ? threads : threads.filter((t) => t.pet_id === filterId);
    count += filteredThreadsForPet.reduce((sum, thread) => sum + (thread.message_count || 0), 0);

    // Count pending approvals for this filter
    const filteredApprovalsForPet =
      filterId === "all"
        ? pendingApprovals
        : pendingApprovals.filter((a) => a.pet_id === filterId);
    count += filteredApprovalsForPet.length;

    return count;
  };

  // Get total unread count
  const totalUnread = useMemo(() => {
    const threadCount = threads.reduce((sum, thread) => sum + (thread.message_count || 0), 0);
    return threadCount + pendingApprovals.length;
  }, [threads, pendingApprovals]);

  // Group filtered threads
  const [filteredGroupedThreads, setFilteredGroupedThreads] = React.useState<GroupedThreads>({
    veterinarian: [],
    dog_walker: [],
    groomer: [],
    pet_sitter: [],
    boarding: [],
    unknown: [],
  });

  React.useEffect(() => {
    const groupFilteredThreads = async () => {
      const grouped = await groupThreadsByType(filteredThreads);
      setFilteredGroupedThreads(grouped);
    };
    groupFilteredThreads();
  }, [filteredThreads]);

  // Handle thread press
  const handleThreadPress = (thread: MessageThread) => {
    setSelectedThread(thread);
  };

  // Handle message press (pending approvals)
  const handleMessagePress = (approval: PendingApprovalWithPet) => {
    setCurrentApproval(approval);
  };

  // Handle add to care team from thread
  const handleAddToCareTeam = (thread: MessageThread) => {
    setThreadToAdd(thread);
    setSelectedMemberType("veterinarian");
    setShowAddMemberModal(true);
  };

  // Handle saving care team member from thread
  const handleAddCareTeamMemberFromThread = async (
    memberData: TablesInsert<"vet_information">
  ) => {
    if (!threadToAdd || pets.length === 0) {
      Alert.alert("Error", "Unable to add care team member");
      return;
    }

    try {
      // Create the vet_information record
      const newMember = await createVetInformation(memberData);

      // Link the care team member to all user's pets
      const linkPromises = pets.map((pet) =>
        linkCareTeamMemberToPet(pet.id, newMember.id)
      );
      await Promise.all(linkPromises);

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["all_care_team_members"] });
      queryClient.invalidateQueries({ queryKey: ["messageThreads"] });

      Alert.alert("Success", "Care team member added successfully");
      setShowAddMemberModal(false);
      setThreadToAdd(null);
    } catch (error) {
      console.error("Error adding care team member:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to add care team member"
      );
      throw error;
    }
  };

  // Get initials for pet avatar
  const getPetInitials = (petName: string): string => {
    const parts = petName.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return petName.substring(0, 2).toUpperCase();
  };

  // Show thread detail view
  if (selectedThread) {
    return (
      <ChatProvider>
        <ThreadDetailView
          threadId={selectedThread.id}
          thread={selectedThread}
          onBack={() => setSelectedThread(null)}
        />
        <BottomNavBar activeTab="messages" />
      </ChatProvider>
    );
  }

  // Default empty grouped threads
  const emptyGroupedThreads: GroupedThreads = {
    veterinarian: [],
    dog_walker: [],
    groomer: [],
    pet_sitter: [],
    boarding: [],
    unknown: [],
  };

  // Group filtered threads
 
  React.useEffect(() => {
    // Skip grouping while loading or if no threads - avoid unnecessary DB calls
    if (loadingThreads || filteredThreads.length === 0) {
      setFilteredGroupedThreads(emptyGroupedThreads);
      return;
    }

    const groupFilteredThreads = async () => {
      const grouped = await groupThreadsByType(filteredThreads);
      setFilteredGroupedThreads(grouped);
    };
    groupFilteredThreads();
  }, [filteredThreads, loadingThreads]);

  const hasMessages = filteredThreads.length > 0 || needsReviewMessages.length > 0;

  return (
    <ChatProvider>
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {/* Header */}
        <HomeHeader />

        {/* Messages Header */}
        <View className="px-4 pb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text
                className="text-2xl font-bold"
                style={{ color: theme.foreground }}
              >
                Messages
              </Text>
              {totalUnread > 0 && (
                <Text
                  className="text-sm mt-0.5"
                  style={{ color: theme.secondary }}
                >
                  {totalUnread} unread
                </Text>
              )}
            </View>
            <TouchableOpacity
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => setShowNewMessageModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={24} color={theme.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Chips */}
        <View className="px-4 pb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 16 }}
          >
            {/* All Filter */}
            <TouchableOpacity
              onPress={() => setSelectedFilter("all")}
              activeOpacity={0.7}
              className="items-center"
            >
              <View
                className="w-14 h-14 rounded-full items-center justify-center mb-1"
                style={{
                  backgroundColor: selectedFilter === "all" ? theme.primary : theme.card,
                  borderWidth: 2,
                  borderColor: selectedFilter === "all" ? theme.primary : "#22C55E",
                }}
              >
                <Text
                  className="text-base font-bold"
                  style={{
                    color: selectedFilter === "all" ? "white" : "#22C55E",
                  }}
                >
                  All
                </Text>
              </View>
              {getUnreadCountForFilter("all") > 0 && (
                <View
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center"
                  style={{ backgroundColor: "#22C55E" }}
                >
                  <Text className="text-xs font-bold text-white">
                    {getUnreadCountForFilter("all")}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Pet Filters */}
            {pets.map((pet) => {
              const unreadCount = getUnreadCountForFilter(pet.id);
              const isSelected = selectedFilter === pet.id;
              return (
                <TouchableOpacity
                  key={pet.id}
                  onPress={() => setSelectedFilter(pet.id)}
                  activeOpacity={0.7}
                  className="items-center"
                >
                  <View
                    className="w-14 h-14 rounded-full items-center justify-center mb-1"
                    style={{
                      backgroundColor: isSelected ? theme.primary : theme.card,
                      borderWidth: 2,
                      borderColor: isSelected ? theme.primary : "#22C55E",
                    }}
                  >
                    <Text
                      className="text-base font-bold"
                      style={{
                        color: isSelected ? "white" : "#22C55E",
                      }}
                    >
                      {getPetInitials(pet.name)}
                    </Text>
                  </View>
                  {unreadCount > 0 && (
                    <View
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center"
                      style={{ backgroundColor: "#22C55E" }}
                    >
                      <Text className="text-xs font-bold text-white">
                        {unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

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
            <Ionicons name="search-outline" size={20} color={theme.secondary} style={{ marginRight: 8 }} />
            <TextInput
              className="flex-1 text-base"
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {loadingThreads ? (
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <>
              {/* Needs Review Section */}
              {needsReviewMessages.length > 0 && (
                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-3 px-4">
                    <View className="flex-row items-center flex-1">
                      <Ionicons
                        name="warning"
                        size={20}
                        color="#EF4444"
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        className="text-base font-bold"
                        style={{ color: "#EF4444" }}
                      >
                        Needs Review
                      </Text>
                    </View>
                  </View>

                  <View>
                    {needsReviewMessages.map((approval) => (
                      <MessageListItem
                        key={approval.id}
                        approval={approval}
                        onPress={() => handleMessagePress(approval)}
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

              {/* Empty State */}
              {!hasMessages && (
                <View className="flex-1 items-center justify-center py-20 px-4">
                  <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-4"
                    style={{ backgroundColor: `${theme.primary}15` }}
                  >
                    <Ionicons name="mail-open-outline" size={40} color={theme.primary} />
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
                    Your messages from vets and care providers will appear here
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Bottom Navigation */}
        <BottomNavBar activeTab="messages" />

        {/* Email Approval Modal */}
        <EmailApprovalModal />

        {/* New Message Modal */}
        <NewMessageModal
          visible={showNewMessageModal}
          onClose={() => setShowNewMessageModal(false)}
          onSend={async (messageData) => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                Alert.alert("Error", "You must be logged in to send messages");
                return;
              }

              const { data, error } = await supabase.functions.invoke("send-message", {
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
    </ChatProvider>
  );
}
