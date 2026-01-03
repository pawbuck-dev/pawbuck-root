import { useTheme } from "@/context/themeContext";
import { MessageThread, ThreadMessage } from "@/services/messages";
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
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchThreadMessages } from "@/services/messages";

interface ThreadDetailViewProps {
  threadId: string;
  thread: MessageThread;
  onBack: () => void;
}

export default function ThreadDetailView({
  threadId,
  thread,
  onBack,
}: ThreadDetailViewProps) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

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
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3 border-b"
        style={{
          backgroundColor: theme.card,
          borderBottomColor: theme.border,
        }}
      >
        <TouchableOpacity
          onPress={onBack}
          className="mr-3 p-2 -ml-2"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.foreground} />
        </TouchableOpacity>
        <View className="flex-1">
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
      </View>

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
    </View>
  );
}

