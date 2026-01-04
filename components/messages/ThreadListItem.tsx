import { useTheme } from "@/context/themeContext";
import { MessageThread } from "@/services/messages";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface ThreadListItemProps {
  thread: MessageThread;
  onPress: () => void;
  onAddToCareTeam?: () => void;
  showAddButton?: boolean;
}

export default function ThreadListItem({ thread, onPress, onAddToCareTeam, showAddButton = false }: ThreadListItemProps) {
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";

  // Get recipient display name
  const recipientName = thread.recipient_name || thread.recipient_email.split("@")[0];

  // Get initials for avatar
  const getInitials = (): string => {
    const name = recipientName || "";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get last message preview
  const getLastMessagePreview = (): string => {
    if (thread.last_message?.body) {
      const preview = thread.last_message.body.trim();
      return preview.length > 60 ? preview.substring(0, 60) + "..." : preview;
    }
    return "No messages yet";
  };

  // Format time ago
  const getTimeAgo = (): string => {
    if (thread.updated_at) {
      return moment(thread.updated_at).fromNow();
    }
    return "";
  };

  // Determine if last message is outbound (from user)
  const isLastMessageOutbound = thread.last_message?.direction === "outbound";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="px-4 py-3"
      style={{
        backgroundColor: theme.card,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      <View className="flex-row items-start">
        {/* Avatar */}
        <View
          className="w-12 h-12 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: `${theme.primary}20` }}
        >
          <Text
            className="text-base font-semibold"
            style={{ color: theme.primary }}
          >
            {getInitials()}
          </Text>
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Header Row */}
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className="text-base font-semibold flex-1"
              style={{ color: theme.foreground }}
              numberOfLines={1}
            >
              {recipientName}
            </Text>
            <Text
              className="text-xs ml-2"
              style={{ color: theme.secondary }}
            >
              {getTimeAgo()}
            </Text>
          </View>

          {/* Subject */}
          <Text
            className="text-sm font-medium mb-1"
            style={{ color: theme.foreground }}
            numberOfLines={1}
          >
            {thread.subject}
          </Text>

          {/* Last Message Preview */}
          <View className="flex-row items-center">
            {isLastMessageOutbound && (
              <Ionicons
                name="arrow-forward"
                size={14}
                color={theme.secondary}
                style={{ marginRight: 4 }}
              />
            )}
            <Text
              className="text-sm flex-1"
              style={{ color: theme.secondary }}
              numberOfLines={1}
            >
              {getLastMessagePreview()}
            </Text>
            {thread.message_count && thread.message_count > 0 && (
              <View
                className="ml-2 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${theme.primary}20` }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: theme.primary }}
                >
                  {thread.message_count}
                </Text>
              </View>
            )}
          </View>

          {/* Pet Name */}
          {thread.pets?.name && (
            <View className="flex-row items-center mt-1">
              <Ionicons
                name="paw"
                size={12}
                color={theme.secondary}
                style={{ marginRight: 4 }}
              />
              <Text
                className="text-xs"
                style={{ color: theme.secondary }}
              >
                {thread.pets.name}
              </Text>
            </View>
          )}
        </View>

        {/* Add to Care Team Button */}
        {showAddButton && onAddToCareTeam && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onAddToCareTeam();
            }}
            className="ml-2 p-2"
            activeOpacity={0.7}
          >
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Ionicons
                name="add"
                size={18}
                color={theme.primary}
              />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

