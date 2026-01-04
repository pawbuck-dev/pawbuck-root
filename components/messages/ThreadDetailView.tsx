import { CareTeamMemberModal } from "@/components/home/CareTeamMemberModal";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { TablesInsert } from "@/database.types";
import { linkCareTeamMemberToPet } from "@/services/careTeamMembers";
import { fetchThreadMessages, MessageThread, ThreadMessage } from "@/services/messages";
import { CareTeamMemberType, createVetInformation, isEmailInCareTeam } from "@/services/vetInformation";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ThreadDetailViewProps {
  threadId: string;
  thread: MessageThread;
  onBack: () => void;
  hideHeader?: boolean;
}

export default function ThreadDetailView({
  threadId,
  thread,
  onBack,
  hideHeader = false,
}: ThreadDetailViewProps) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { pets } = usePets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [isInCareTeam, setIsInCareTeam] = useState<boolean | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedMemberType, setSelectedMemberType] = useState<CareTeamMemberType>("veterinarian");

  // Fetch messages for this thread
  const {
    data: messages = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["threadMessages", threadId],
    queryFn: () => fetchThreadMessages(threadId),
  });

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Get recipient display name
  const recipientName = thread.recipient_name || thread.recipient_email.split("@")[0];

  // Check if recipient is in care team
  useEffect(() => {
    const checkCareTeam = async () => {
      try {
        const inTeam = await isEmailInCareTeam(thread.recipient_email);
        setIsInCareTeam(inTeam);
      } catch (error) {
        console.error("Error checking care team:", error);
        setIsInCareTeam(false);
      }
    };
    checkCareTeam();
  }, [thread.recipient_email]);

  // Handle adding care team member from thread detail
  const handleAddCareTeamMemberFromThread = async (
    memberData: TablesInsert<"vet_information">
  ) => {
    if (pets.length === 0) {
      Alert.alert("Error", "You need to have at least one pet to add a care team member");
      return;
    }

    try {
      // Ensure email matches the thread's recipient email
      const memberDataWithEmail = {
        ...memberData,
        email: thread.recipient_email.toLowerCase(),
      };

      // Create the vet_information record
      const newMember = await createVetInformation(memberDataWithEmail);

      // Link the care team member to all user's pets
      const linkPromises = pets.map((pet) =>
        linkCareTeamMemberToPet(pet.id, newMember.id)
      );
      await Promise.all(linkPromises);

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ["all_care_team_members"] });
      queryClient.invalidateQueries({ queryKey: ["messageThreads"] });

      setIsInCareTeam(true);
      Alert.alert("Success", "Care team member added successfully");
      setShowAddMemberModal(false);
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

  // Handle sending a reply
  const handleSendReply = async () => {
    if (!replyText.trim() || sending) return;

    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "You must be logged in to send messages");
        return;
      }

      const { error } = await supabase.functions.invoke("send-message", {
        body: {
          petId: thread.pet_id,
          to: thread.recipient_email,
          subject: thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`,
          message: replyText.trim(),
        },
      });

      if (error) {
        throw error;
      }

      // Clear input
      setReplyText("");

      // Refetch messages and threads
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["messageThreads"] });

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error("Error sending reply:", error);
      
      // Extract error message from Supabase function error
      let errorMessage = "Failed to send message. Please try again.";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }
      
      // Provide more helpful error messages
      if (errorMessage.includes("not configured") || errorMessage.includes("configuration error")) {
        errorMessage = "Email service is not configured. Please contact support.";
      } else if (errorMessage.includes("unavailable")) {
        errorMessage = "Email service is temporarily unavailable. Please try again later.";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setSending(false);
    }
  };

  // Render a single message
  const renderMessage = (message: ThreadMessage, index: number) => {
    const isOutbound = message.direction === "outbound";
    const isLastMessage = index === messages.length - 1;

    return (
      <View
        key={message.id}
        className="px-4 py-3"
        style={{
          backgroundColor: isOutbound
            ? `${theme.primary}15`
            : theme.background,
        }}
      >
        <View
          className={`flex-row ${isOutbound ? "justify-end" : "justify-start"}`}
        >
          <View
            className="max-w-[80%] rounded-2xl px-4 py-3"
            style={{
              backgroundColor: isOutbound
                ? theme.primary
                : theme.card,
            }}
          >
            {/* Message Header */}
            <View className="flex-row items-center justify-between mb-2">
              <Text
                className="text-xs font-semibold"
                style={{
                  color: isOutbound
                    ? "white"
                    : theme.foreground,
                }}
              >
                {isOutbound ? "You" : recipientName}
              </Text>
              <Text
                className="text-xs ml-2"
                style={{
                  color: isOutbound
                    ? "rgba(255,255,255,0.8)"
                    : theme.secondary,
                }}
              >
                {moment(message.sent_at).format("MMM D, h:mm A")}
              </Text>
            </View>

            {/* Message Body */}
            <Text
              className="text-base"
              style={{
                color: isOutbound
                  ? "white"
                  : theme.foreground,
              }}
            >
              {message.body}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* Header - conditionally shown */}
      {!hideHeader && (
        <View
          className="flex-row items-center px-6 py-4 border-b"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          }}
        >
          <Pressable
            onPress={onBack}
            className="w-10 h-10 items-center justify-center mr-4 active:opacity-70"
          >
            <Ionicons name="chevron-back" size={24} color={theme.foreground} />
          </Pressable>
          <View className="flex-1 items-center justify-center">
            <Text
              className="text-lg font-semibold"
              style={{ color: theme.foreground }}
              numberOfLines={1}
            >
              {recipientName}
            </Text>
            <Text
              className="text-sm"
              style={{ color: theme.secondary }}
              numberOfLines={1}
            >
              {thread.subject}
            </Text>
          </View>
          {/* Spacer to balance the back button */}
          <View className="w-10 h-10 mr-4" />
        </View>
      )}

      {/* Thread Info Bar - shown when header is hidden */}
      {hideHeader && (
        <View
          className="items-center px-4 py-3 border-b"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          }}
        >
          <Text
            className="text-base font-semibold text-center"
            style={{ color: theme.foreground }}
            numberOfLines={1}
          >
            {recipientName}
          </Text>
          <Text
            className="text-sm text-center"
            style={{ color: theme.secondary }}
            numberOfLines={1}
          >
            {thread.subject}
          </Text>
        </View>
      )}

      {/* Messages List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons
            name="chatbubbles-outline"
            size={64}
            color={theme.secondary}
            style={{ opacity: 0.3, marginBottom: 16 }}
          />
          <Text
            className="text-lg font-semibold text-center mb-2"
            style={{ color: theme.foreground }}
          >
            No messages yet
          </Text>
          <Text
            className="text-sm text-center"
            style={{ color: theme.secondary }}
          >
            Start the conversation by sending a message
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 8 }}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {messages.map((message, index) => renderMessage(message, index))}
        </ScrollView>
      )}

      {/* Reply Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View
          className="px-4 py-3 border-t"
          style={{
            backgroundColor: theme.card,
            borderTopColor: theme.border,
          }}
        >
          <View className="flex-row items-end">
            <View
              className="flex-1 rounded-2xl px-4 py-3 mr-3"
              style={{
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                maxHeight: 100,
              }}
            >
              <TextInput
                className="text-base flex-1"
                style={{ color: theme.foreground }}
                placeholder="Type a message..."
                placeholderTextColor={theme.secondary}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity
              onPress={handleSendReply}
              disabled={!replyText.trim() || sending}
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{
                backgroundColor: replyText.trim() && !sending
                  ? theme.primary
                  : theme.border,
              }}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={replyText.trim() && !sending ? "white" : theme.secondary}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Add Care Team Member Modal */}
      {pets.length > 0 && (
        <CareTeamMemberModal
          visible={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          onSave={handleAddCareTeamMemberFromThread}
          memberType={selectedMemberType}
          onTypeChange={setSelectedMemberType}
          petId={thread.pet_id}
          memberInfo={null}
          initialEmail={thread.recipient_email}
        />
      )}
    </View>
  );
}

