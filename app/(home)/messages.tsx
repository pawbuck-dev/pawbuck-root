import { EmailApprovalModal } from "@/components/email-approval/EmailApprovalModal";
import BottomNavBar from "@/components/home/BottomNavBar";
import HomeHeader from "@/components/home/HomeHeader";
import MessageListItem from "@/components/messages/MessageListItem";
import { NewMessageModal } from "@/components/messages/NewMessageModal";
import ThreadDetailView from "@/components/messages/ThreadDetailView";
import ThreadListItem from "@/components/messages/ThreadListItem";
import { ChatProvider } from "@/context/chatContext";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { useTheme } from "@/context/themeContext";
import { fetchMessageThreads, MessageThread } from "@/services/messages";
import { PendingApprovalWithPet } from "@/services/pendingEmailApprovals";
import { supabase } from "@/utils/supabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
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

type MessageCategory = "needs_review" | "veterinarians" | "dog_walkers" | "groomers" | "pet_sitters";
type ViewMode = "threads" | "pending";

interface CategorizedMessages {
  needs_review: PendingApprovalWithPet[];
  veterinarians: PendingApprovalWithPet[];
  dog_walkers: PendingApprovalWithPet[];
  groomers: PendingApprovalWithPet[];
  pet_sitters: PendingApprovalWithPet[];
}

export default function MessagesScreen() {
  const { theme, mode } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pendingApprovals, setCurrentApproval } = useEmailApproval();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("threads");
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch message threads
  const {
    data: threads = [],
    isLoading: loadingThreads,
    refetch: refetchThreads,
    error: threadsError,
  } = useQuery({
    queryKey: ["messageThreads"],
    queryFn: () => fetchMessageThreads(),
  });

  // Log errors for debugging
  React.useEffect(() => {
    if (threadsError) {
      console.error("[MessagesScreen] Error fetching threads:", threadsError);
    }
  }, [threadsError]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchThreads()]);
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

  // Categorize messages (for pending approvals view)
  const categorizedMessages = useMemo<CategorizedMessages>(() => {
    const categories: CategorizedMessages = {
      needs_review: [],
      veterinarians: [],
      dog_walkers: [],
      groomers: [],
      pet_sitters: [],
    };

    pendingApprovals.forEach((approval) => {
      if (approval.validation_status === "incorrect") {
        categories.needs_review.push(approval);
      } else {
        const senderEmail = approval.sender_email?.toLowerCase() || "";
        const senderName = approval.sender_email?.split("@")[0] || "";

        if (
          senderEmail.includes("vet") ||
          senderEmail.includes("veterinary") ||
          senderEmail.includes("hospital") ||
          senderEmail.includes("clinic") ||
          senderEmail.includes("animal") ||
          senderName.includes("dr") ||
          senderName.includes("doctor")
        ) {
          categories.veterinarians.push(approval);
        } else if (
          senderEmail.includes("walker") ||
          senderEmail.includes("walk") ||
          senderEmail.includes("paw")
        ) {
          categories.dog_walkers.push(approval);
        } else if (
          senderEmail.includes("groom") ||
          senderEmail.includes("groomer") ||
          senderEmail.includes("salon")
        ) {
          categories.groomers.push(approval);
        } else if (
          senderEmail.includes("sitter") ||
          senderEmail.includes("care") ||
          senderEmail.includes("boarding")
        ) {
          categories.pet_sitters.push(approval);
        } else {
          categories.veterinarians.push(approval);
        }
      }
    });

    return categories;
  }, [pendingApprovals]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categorizedMessages;
    }

    const query = searchQuery.toLowerCase();
    const filterMessages = (messages: PendingApprovalWithPet[]) =>
      messages.filter(
        (msg) =>
          msg.sender_email?.toLowerCase().includes(query) ||
          msg.pets?.name?.toLowerCase().includes(query) ||
          msg.document_type?.toLowerCase().includes(query)
      );

    return {
      needs_review: filterMessages(categorizedMessages.needs_review),
      veterinarians: filterMessages(categorizedMessages.veterinarians),
      dog_walkers: filterMessages(categorizedMessages.dog_walkers),
      groomers: filterMessages(categorizedMessages.groomers),
      pet_sitters: filterMessages(categorizedMessages.pet_sitters),
    };
  }, [categorizedMessages, searchQuery]);

  const getUnreadCount = (category: MessageCategory): number => {
    return filteredCategories[category].length;
  };

  const totalUnread = useMemo(() => {
    return Object.values(filteredCategories).reduce(
      (sum, messages) => sum + messages.length,
      0
    );
  }, [filteredCategories]);

  // Handle thread press
  const handleThreadPress = (thread: MessageThread) => {
    setSelectedThread(thread);
  };

  // Handle message press (pending approvals)
  const handleMessagePress = (approval: PendingApprovalWithPet) => {
    setCurrentApproval(approval);
  };

  // Render category section (for pending approvals)
  const renderCategorySection = (
    category: MessageCategory,
    title: string,
    icon: keyof typeof Ionicons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap,
    iconType: "ionicons" | "material" = "ionicons",
    color: string
  ) => {
    const messages = filteredCategories[category];
    const unreadCount = getUnreadCount(category);

    if (messages.length === 0) return null;

    return (
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-3 px-4">
          <View className="flex-row items-center flex-1">
            {iconType === "material" ? (
              <MaterialCommunityIcons
                name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={20}
                color={color}
                style={{ marginRight: 8 }}
              />
            ) : (
              <Ionicons
                name={icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={color}
                style={{ marginRight: 8 }}
              />
            )}
            <Text
              className="text-base font-bold"
              style={{
                color: category === "needs_review" ? "#F97316" : theme.foreground,
              }}
            >
              {title}
            </Text>
          </View>
          {unreadCount > 0 && (
            <View
              className="w-6 h-6 rounded-full items-center justify-center"
              style={{
                backgroundColor: category === "needs_review" ? "#EF4444" : color,
              }}
            >
              <Text className="text-xs font-bold text-white">{unreadCount}</Text>
            </View>
          )}
        </View>

        <View>
          {messages.map((approval) => (
            <MessageListItem
              key={approval.id}
              approval={approval}
              onPress={() => handleMessagePress(approval)}
            />
          ))}
        </View>
      </View>
    );
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

  return (
    <ChatProvider>
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {/* Header */}
        <HomeHeader />

        {/* Messages Header */}
        <View className="px-4 pb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: `${theme.primary}15` }}
              >
                <Ionicons name="mail-outline" size={20} color={theme.primary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-2xl font-bold"
                  style={{ color: theme.foreground }}
                >
                  Messages
                </Text>
                {viewMode === "threads" ? (
                  filteredThreads.length > 0 && (
                    <Text
                      className="text-sm mt-0.5"
                      style={{ color: theme.secondary }}
                    >
                      {filteredThreads.length} conversation{filteredThreads.length !== 1 ? "s" : ""}
                    </Text>
                  )
                ) : (
                  totalUnread > 0 && (
                    <Text
                      className="text-sm mt-0.5"
                      style={{ color: theme.secondary }}
                    >
                      {totalUnread} unread
                    </Text>
                  )
                )}
              </View>
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

          {/* View Mode Toggle */}
          <View className="flex-row mt-4">
            <TouchableOpacity
              onPress={() => setViewMode("threads")}
              className="flex-1 py-2 px-4 rounded-xl mr-2"
              style={{
                backgroundColor: viewMode === "threads" ? theme.primary : theme.card,
                borderWidth: 1,
                borderColor: viewMode === "threads" ? theme.primary : theme.border,
              }}
              activeOpacity={0.7}
            >
              <Text
                className="text-sm font-semibold text-center"
                style={{
                  color: viewMode === "threads" ? "white" : theme.foreground,
                }}
              >
                Conversations ({threads.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode("pending")}
              className="flex-1 py-2 px-4 rounded-xl ml-2"
              style={{
                backgroundColor: viewMode === "pending" ? theme.primary : theme.card,
                borderWidth: 1,
                borderColor: viewMode === "pending" ? theme.primary : theme.border,
              }}
              activeOpacity={0.7}
            >
              <Text
                className="text-sm font-semibold text-center"
                style={{
                  color: viewMode === "pending" ? "white" : theme.foreground,
                }}
              >
                Pending ({totalUnread})
              </Text>
            </TouchableOpacity>
          </View>
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
              placeholder={viewMode === "threads" ? "Search conversations..." : "Search pending..."}
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
          {viewMode === "threads" ? (
            <>
              {loadingThreads ? (
                <View className="flex-1 items-center justify-center py-20">
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              ) : filteredThreads.length === 0 ? (
                <View className="flex-1 items-center justify-center py-20 px-4">
                  <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-4"
                    style={{ backgroundColor: `${theme.primary}15` }}
                  >
                    <Ionicons name="chatbubbles-outline" size={40} color={theme.primary} />
                  </View>
                  <Text
                    className="text-xl font-bold text-center mb-2"
                    style={{ color: theme.foreground }}
                  >
                    No Conversations
                  </Text>
                  <Text
                    className="text-base text-center mb-4"
                    style={{ color: theme.secondary }}
                  >
                    Start a conversation by sending a message
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowNewMessageModal(true)}
                    className="px-6 py-3 rounded-xl"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <Text className="text-base font-semibold text-white">
                      New Message
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredThreads.map((thread) => (
                  <ThreadListItem
                    key={thread.id}
                    thread={thread}
                    onPress={() => handleThreadPress(thread)}
                  />
                ))
              )}
            </>
          ) : (
            <>
              {renderCategorySection(
                "needs_review",
                "Needs Review",
                "warning",
                "ionicons",
                "#EF4444"
              )}

              {renderCategorySection(
                "veterinarians",
                "Veterinarians",
                "medical",
                "ionicons",
                "#3BD0D2"
              )}

              {renderCategorySection(
                "dog_walkers",
                "Dog Walkers",
                "paw",
                "material",
                "#22C55E"
              )}

              {renderCategorySection(
                "groomers",
                "Groomers",
                "cut",
                "material",
                "#A855F7"
              )}

              {renderCategorySection(
                "pet_sitters",
                "Pet Sitters",
                "heart",
                "material",
                "#F97316"
              )}

              {totalUnread === 0 && (
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
                    No Pending Messages
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
