import { EmailApprovalModal } from "@/components/email-approval/EmailApprovalModal";
import BottomNavBar from "@/components/home/BottomNavBar";
import MessageListItem from "@/components/messages/MessageListItem";
import { ChatProvider } from "@/context/chatContext";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { useTheme } from "@/context/themeContext";
import { PendingApprovalWithPet } from "@/services/pendingEmailApprovals";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type MessageCategory = "needs_review" | "veterinarians" | "dog_walkers" | "groomers" | "pet_sitters";

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
  const { pendingApprovals, setCurrentApproval } = useEmailApproval();
  const [searchQuery, setSearchQuery] = useState("");

  // Categorize messages
  const categorizedMessages = useMemo<CategorizedMessages>(() => {
    const categories: CategorizedMessages = {
      needs_review: [],
      veterinarians: [],
      dog_walkers: [],
      groomers: [],
      pet_sitters: [],
    };

    pendingApprovals.forEach((approval) => {
      // Needs Review: records with validation_status = 'incorrect'
      if (approval.validation_status === "incorrect") {
        categories.needs_review.push(approval);
      } else {
        // Categorize by sender email/name (simplified logic - can be enhanced)
        const senderEmail = approval.sender_email?.toLowerCase() || "";
        const senderName = approval.sender_email?.split("@")[0] || "";

        // Simple categorization based on keywords (can be improved with vet_information lookup)
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
          // Default to veterinarians if unknown
          categories.veterinarians.push(approval);
        }
      }
    });

    return categories;
  }, [pendingApprovals]);

  // Filter messages based on search query
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

  // Calculate unread counts
  const getUnreadCount = (category: MessageCategory): number => {
    return filteredCategories[category].length;
  };

  const totalUnread = useMemo(() => {
    return Object.values(filteredCategories).reduce(
      (sum, messages) => sum + messages.length,
      0
    );
  }, [filteredCategories]);

  // Handle message press - show approval modal
  const handleMessagePress = (approval: PendingApprovalWithPet) => {
    setCurrentApproval(approval);
  };

  // Render category section
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

        {/* Message List */}
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

  return (
    <ChatProvider>
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {/* Header */}
        <View
          className="px-4 pt-12 pb-4"
          style={{ backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}
        >
        <View className="flex-row items-center justify-between mb-4">
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
              {totalUnread > 0 && (
                <Text
                  className="text-sm mt-0.5"
                  style={{ color: theme.secondary }}
                >
                  {totalUnread} unread
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.background }}
            onPress={() => {
              // TODO: Implement add message functionality
            }}
          >
            <Ionicons name="add" size={24} color={theme.foreground} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          className="flex-row items-center px-4 py-3 rounded-2xl"
          style={{ backgroundColor: theme.background }}
        >
          <Ionicons name="search" size={20} color={theme.secondary} style={{ marginRight: 8 }} />
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
      >
        {/* Needs Review Section */}
        {renderCategorySection(
          "needs_review",
          "Needs Review",
          "warning",
          "ionicons",
          "#EF4444"
        )}

        {/* Veterinarians Section */}
        {renderCategorySection(
          "veterinarians",
          "Veterinarians",
          "medical",
          "ionicons",
          "#3BD0D2"
        )}

        {/* Dog Walkers Section */}
        {renderCategorySection(
          "dog_walkers",
          "Dog Walkers",
          "paw",
          "material",
          "#22C55E"
        )}

        {/* Groomers Section */}
        {renderCategorySection(
          "groomers",
          "Groomers",
          "cut",
          "material",
          "#A855F7"
        )}

        {/* Pet Sitters Section */}
        {renderCategorySection(
          "pet_sitters",
          "Pet Sitters",
          "heart",
          "material",
          "#F97316"
        )}

        {/* Empty State */}
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
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavBar activeTab="messages" />

        {/* Email Approval Modal */}
        <EmailApprovalModal />
      </View>
    </ChatProvider>
  );
}

