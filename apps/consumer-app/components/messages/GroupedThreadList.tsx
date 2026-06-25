import { NavigationIconWell } from "@/components/ui/IconWell";
import { useTheme } from "@/context/themeContext";
import { CareTeamMemberType } from "@/services/careTeamMembers";
import { MessageThread } from "@/services/messages";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { MESSAGES_INBOX } from "./inboxUiTokens";
import ThreadListItem from "./ThreadListItem";

interface GroupedThreadListProps {
  threads: MessageThread[];
  category: CareTeamMemberType;
  title: string;
  icon:
    | keyof typeof MaterialCommunityIcons.glyphMap
    | keyof typeof Ionicons.glyphMap;
  iconType: "material" | "ionicons";
  onThreadPress: (thread: MessageThread) => void;
  getUnreadCount?: (threads: MessageThread[]) => number;
  onAddToCareTeam?: (thread: MessageThread) => void;
  isUnknownCategory?: boolean;
  contentInsetX?: number;
}

export default function GroupedThreadList({
  threads,
  title,
  icon,
  iconType,
  onThreadPress,
  getUnreadCount,
  onAddToCareTeam,
  isUnknownCategory = false,
  contentInsetX = MESSAGES_INBOX.paddingH,
}: GroupedThreadListProps) {
  const { theme } = useTheme();

  if (threads.length === 0) return null;

  const unreadCount = getUnreadCount
    ? getUnreadCount(threads)
    : threads.reduce((sum, thread) => sum + (thread.unread_count || 0), 0);

  return (
    <View style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          paddingHorizontal: contentInsetX,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View style={{ marginRight: 8 }}>
            {iconType === "material" ? (
              <NavigationIconWell size="sm" materialIcon={icon as keyof typeof MaterialCommunityIcons.glyphMap} />
            ) : (
              <NavigationIconWell size="sm" ionIcon={icon as keyof typeof Ionicons.glyphMap} />
            )}
          </View>
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 16,
              color: theme.foreground,
            }}
          >
            {title}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <View
            style={{
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
              {unreadCount}
            </Text>
          </View>
        ) : null}
      </View>

      <View>
        {threads.map((thread) => (
          <ThreadListItem
            key={thread.id}
            thread={thread}
            insetX={contentInsetX}
            onPress={() => onThreadPress(thread)}
            onAddToCareTeam={
              isUnknownCategory && onAddToCareTeam
                ? () => onAddToCareTeam(thread)
                : undefined
            }
            showAddButton={isUnknownCategory && !!onAddToCareTeam}
          />
        ))}
      </View>
    </View>
  );
}
