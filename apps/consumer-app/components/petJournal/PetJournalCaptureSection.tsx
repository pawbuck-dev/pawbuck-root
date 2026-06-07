import { getJournalSurfaceTokens } from "@/components/petJournal/journalSurfaceTokens";
import type { JournalDomain } from "@/constants/petJournal";
import type { Pet } from "@/context/petsContext";
import { useSubscription } from "@/context/subscriptionContext";
import { useTheme } from "@/context/themeContext";
import { openMiloJournalCheckIn } from "@/utils/openMiloJournalCheckIn";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

const MILO_AVATAR = require("@/assets/images/milo_gif.gif");

const QUICK_TOPICS: Record<JournalDomain, readonly string[]> = {
  health: ["Lethargic today", "Changed appetite", "Vomiting or diarrhea"],
  behavioral: ["More anxious", "Unusual barking", "Log behavior note"],
  environmental: ["Log a meal", "Changed food", "After our walk"],
};

type Shortcut = {
  id: string;
  label: string;
  domain: JournalDomain;
  subtype: string;
};

const MANUAL_SHORTCUTS: Shortcut[] = [
  { id: "symptom", label: "Symptom", domain: "health", subtype: "symptom" },
  { id: "appetite", label: "Appetite", domain: "health", subtype: "diet" },
  { id: "mood", label: "Mood", domain: "health", subtype: "mood" },
  { id: "note", label: "Free note", domain: "health", subtype: "other" },
];

type Props = {
  pet: Pet;
  domain: JournalDomain;
};

export function PetJournalCaptureSection({ pet, domain }: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const surfaces = getJournalSurfaceTokens(isDark, theme);
  const router = useRouter();
  const { aiJournalEntriesRemaining, status: subscriptionStatus } = useSubscription();
  const [draft, setDraft] = useState("");

  const showAiQuota =
    aiJournalEntriesRemaining != null && (subscriptionStatus?.usage.aiJournalEntriesUsed ?? 0) > 0;

  const topics = useMemo(() => QUICK_TOPICS[domain], [domain]);

  const openMilo = useCallback(
    (context?: string) => {
      if (context?.trim()) {
        router.push({
          pathname: "/(home)/milo",
          params: { pet: pet.id, context: encodeURIComponent(context.trim()), journalDomain: domain },
        } as any);
        return;
      }
      openMiloJournalCheckIn(router, pet.id, { journalDomain: domain });
    },
    [domain, pet.id, router]
  );

  const openManual = useCallback(
    (shortcut: Shortcut) => {
      router.push({
        pathname: "/(home)/pet-journal/new",
        params: { petId: pet.id, domain: shortcut.domain, subtype: shortcut.subtype },
      } as any);
    },
    [pet.id, router]
  );

  return (
    <View
      style={{
        backgroundColor: surfaces.cardBackground,
        borderRadius: 22,
        padding: 18,
        borderWidth: 1,
        borderColor: surfaces.borderColor,
        marginBottom: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <Image
          source={MILO_AVATAR}
          style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }}
          contentFit="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.foreground }}>
            Log a note
          </Text>
          <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 3, lineHeight: 18 }}>
            {`Milo asks follow-ups from ${pet.name}'s health record.`}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => openMilo()}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 15,
          borderRadius: 14,
          backgroundColor: theme.primary,
          marginBottom: showAiQuota ? 6 : 14,
        }}
        accessibilityRole="button"
        accessibilityLabel={`Check in with Milo about ${pet.name}`}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: theme.primaryForeground }}>
          Check in with Milo
        </Text>
        <Ionicons name="chevron-forward" size={18} color={theme.primaryForeground} />
      </Pressable>

      {showAiQuota ? (
        <Text
          style={{
            fontSize: 12,
            color: theme.secondary,
            textAlign: "center",
            marginBottom: 14,
          }}
        >
          {aiJournalEntriesRemaining} AI check-in{aiJournalEntriesRemaining === 1 ? "" : "s"} left
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 6,
          marginBottom: 14,
        }}
      >
        {MANUAL_SHORTCUTS.map((shortcut) => (
          <Pressable
            key={shortcut.id}
            onPress={() => openManual(shortcut)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 100,
              backgroundColor: surfaces.mutedChipBackground,
            }}
            accessibilityRole="button"
            accessibilityLabel={`Add ${shortcut.label}`}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: surfaces.mutedChipForeground }}>
              {shortcut.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
      >
        {topics.map((topic) => (
          <Pressable
            key={topic}
            onPress={() => openMilo(topic)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 100,
              borderWidth: 1,
              borderColor: surfaces.borderColor,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "500", color: theme.foreground }}>{topic}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginTop: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 14,
          backgroundColor: surfaces.insetBackground,
          borderWidth: 1,
          borderColor: surfaces.borderColor,
        }}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.primary} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={`Or describe ${pet.name} in your own words…`}
          placeholderTextColor={theme.secondary}
          style={{ flex: 1, fontSize: 15, color: theme.foreground, paddingVertical: 0 }}
          returnKeyType="send"
          onSubmitEditing={() => {
            if (draft.trim()) {
              openMilo(draft);
              setDraft("");
            }
          }}
        />
        <TouchableOpacity
          onPress={() => {
            if (draft.trim()) {
              openMilo(draft);
              setDraft("");
            }
          }}
          disabled={!draft.trim()}
          hitSlop={8}
          style={{ opacity: draft.trim() ? 1 : 0.4 }}
        >
          <Ionicons name="arrow-forward-circle" size={26} color={theme.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
