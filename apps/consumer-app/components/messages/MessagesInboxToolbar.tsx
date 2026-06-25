import PetSelector from "@/components/home/PetSelector";
import {
  HORIZONTAL_PILL_ROW_GAP,
  HORIZONTAL_PILL_ROW_PADDING_H,
  HorizontalPillChip,
} from "@/components/ui/HorizontalPillChip";
import type { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import type { CareTeamMemberType } from "@/services/careTeamMembers";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, TextInput, View } from "react-native";
import { MESSAGES_INBOX } from "./inboxUiTokens";

export type MessageCareTeamFilter = "all" | CareTeamMemberType;

export const MESSAGE_CARE_TEAM_FILTERS: {
  id: MessageCareTeamFilter;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { id: "all", label: "All", icon: "view-grid-outline" },
  { id: "veterinarian", label: "Vets", icon: "stethoscope" },
  { id: "dog_walker", label: "Walkers", icon: "walk" },
  { id: "boarding", label: "Boarding", icon: "home-city-outline" },
  { id: "groomer", label: "Groomers", icon: "content-cut" },
  { id: "pet_sitter", label: "Sitters", icon: "heart-outline" },
  { id: "unknown", label: "Other", icon: "email-outline" },
];

export const MESSAGE_CARE_TEAM_SECTION_TITLES: Record<CareTeamMemberType | "unknown", string> = {
  veterinarian: "Vets",
  dog_walker: "Walkers",
  boarding: "Boarding",
  groomer: "Groomers",
  pet_sitter: "Sitters",
  unknown: "Other",
};

type MessagesInboxToolbarProps = {
  careTeamFilter: MessageCareTeamFilter;
  onCareTeamFilterChange: (filter: MessageCareTeamFilter) => void;
  showCareTeamFilters: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  showSearch: boolean;
  pets: Pet[];
  selectedPetId: string | null;
  onSelectPet: (petId: string) => void;
  showPetFilter: boolean;
  notificationCounts?: Record<string, number>;
};

export function MessagesInboxToolbar({
  careTeamFilter,
  onCareTeamFilterChange,
  showCareTeamFilters,
  searchQuery,
  onSearchQueryChange,
  showSearch,
  pets,
  selectedPetId,
  onSelectPet,
  showPetFilter,
  notificationCounts = {},
}: MessagesInboxToolbarProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  if (!showCareTeamFilters && !showSearch && !showPetFilter) {
    return null;
  }

  return (
    <View style={{ paddingBottom: MESSAGES_INBOX.sectionGap }}>
      {showCareTeamFilters ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{
            paddingHorizontal: HORIZONTAL_PILL_ROW_PADDING_H,
            paddingTop: 4,
            paddingBottom: showSearch || showPetFilter ? 10 : 4,
            flexDirection: "row",
            alignItems: "center",
            gap: HORIZONTAL_PILL_ROW_GAP,
          }}
        >
          {MESSAGE_CARE_TEAM_FILTERS.map((f) => {
            const selected = careTeamFilter === f.id;
            return (
              <HorizontalPillChip
                key={f.id}
                label={f.label}
                selected={selected}
                leadingWell={false}
                onPress={() => onCareTeamFilterChange(f.id)}
                leading={
                  <MaterialCommunityIcons
                    name={f.icon}
                    size={16}
                    color={selected ? "rgba(255,255,255,0.85)" : theme.secondary}
                  />
                }
              />
            );
          })}
        </ScrollView>
      ) : null}

      {showSearch ? (
        <View
          style={{
            paddingHorizontal: HORIZONTAL_PILL_ROW_PADDING_H,
            paddingBottom: showPetFilter ? 10 : 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 11,
              borderRadius: MESSAGES_INBOX.searchRadius,
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
            }}
          >
            <Ionicons name="search-outline" size={18} color={theme.secondary} style={{ marginRight: 8 }} />
            <TextInput
              style={{
                flex: 1,
                fontFamily: "Poppins_400Regular",
                fontSize: 15,
                color: theme.foreground,
                padding: 0,
              }}
              placeholder="Search conversations…"
              placeholderTextColor={theme.secondary}
              value={searchQuery}
              onChangeText={onSearchQueryChange}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
        </View>
      ) : null}

      {showPetFilter ? (
        <PetSelector
          pets={pets}
          selectedPetId={selectedPetId}
          onSelectPet={onSelectPet}
          notificationCounts={notificationCounts}
        />
      ) : null}
    </View>
  );
}
