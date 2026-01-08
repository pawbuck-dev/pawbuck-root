import { useTheme } from "@/context/themeContext";
import { MessageThread } from "@/services/messages";
import { CareTeamMemberType } from "@/services/careTeamMembers";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import ThreadListItem from "./ThreadListItem";

interface GroupedThreadListProps {
  threads: MessageThread[];
  category: CareTeamMemberType;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap | keyof typeof Ionicons.glyphMap;
  iconType: "material" | "ionicons";
  color: string;
  onThreadPress: (thread: MessageThread) => void;
  getUnreadCount?: (threads: MessageThread[]) => number;
  onAddToCareTeam?: (thread: MessageThread) => void;
  isUnknownCategory?: boolean;
}

export default function GroupedThreadList({
  threads,
  category,
  title,
  icon,
  iconType,
  color,
  onThreadPress,
  getUnreadCount,
  onAddToCareTeam,
  isUnknownCategory = false,
}: GroupedThreadListProps) {
  const { theme } = useTheme();

  if (threads.length === 0) return null;

  const unreadCount = getUnreadCount
    ? getUnreadCount(threads)
    : threads.reduce(
        (sum, thread) => sum + (thread.message_count || 0),
        0
      );

  return (
    <View className="mb-6">
      {/* Category Header */}
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
            style={{ color: theme.foreground }}
          >
            {title}
          </Text>
        </View>
        {unreadCount > 0 && (
          <View
            className="w-6 h-6 rounded-full items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <Text className="text-xs font-bold text-white">{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Thread List */}
      <View>
        {threads.map((thread) => (
          <ThreadListItem
            key={thread.id}
            thread={thread}
            onPress={() => onThreadPress(thread)}
            onAddToCareTeam={isUnknownCategory && onAddToCareTeam ? () => onAddToCareTeam(thread) : undefined}
            showAddButton={isUnknownCategory && !!onAddToCareTeam}
          />
        ))}
      </View>
    </View>
  );
}

