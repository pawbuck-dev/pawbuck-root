import type { JournalDomain } from "@/constants/petJournal";
import type { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { getJournalSurfaceTokens } from "@/components/petJournal/journalSurfaceTokens";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const MILO_AVATAR = require("@/assets/images/milo_gif.gif");

const QUICK_PROMPTS: Record<JournalDomain, readonly string[]> = {
  health: [
    "Lethargic today",
    "Changed appetite",
    "Vomiting or diarrhea",
    "Scratching a lot",
    "Limping",
    "Coughing",
    "Eye or ear issue",
  ],
  behavioral: ["Unusual barking", "More anxious", "Hiding", "Hyperactive", "Log behavior note"],
  environmental: [
    "Changed food brand",
    "New pet at home",
    "Travel stress",
    "Weather change",
    "Log a meal",
    "After our walk",
  ],
};

export interface MiloJournalBarProps {
  pet: Pet;
  domain: JournalDomain;
}

export const MiloJournalBar: React.FC<MiloJournalBarProps> = ({ pet, domain }) => {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const surfaces = getJournalSurfaceTokens(isDark, theme);
  const router = useRouter();
  const [draft, setDraft] = useState("");

  const pills = useMemo(() => QUICK_PROMPTS[domain], [domain]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const encoded = encodeURIComponent(t);
    setDraft("");
    router.push({
      pathname: "/(home)/milo",
      params: { pet: pet.id, context: encoded, journalDomain: domain },
    } as any);
  };

  return (
    <View
      style={{
        backgroundColor: surfaces.cardBackground,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: surfaces.borderColor,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Image
          source={MILO_AVATAR}
          style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }}
          contentFit="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.foreground }}>
            Talk to Milo
          </Text>
          <Text style={{ fontSize: 11, color: theme.secondary, marginTop: 2 }}>
            I&apos;ll use what&apos;s on {pet.name}&apos;s record to keep questions short.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/(home)/pet-journal/new",
              params: { petId: pet.id, domain },
            } as any)
          }
          hitSlop={8}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.primary }}>
            Manual entry
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 14,
          backgroundColor: surfaces.insetBackground,
          borderWidth: 1,
          borderColor: surfaces.borderColor,
          marginBottom: 12,
        }}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.primary} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={`Tell Milo about ${pet.name}...`}
          placeholderTextColor={theme.secondary}
          style={{
            flex: 1,
            fontSize: 15,
            color: theme.foreground,
            paddingVertical: 0,
          }}
          returnKeyType="send"
          onSubmitEditing={() => submit(draft)}
        />
        <TouchableOpacity
          onPress={() => submit(draft)}
          disabled={!draft.trim()}
          hitSlop={8}
          style={{ opacity: draft.trim() ? 1 : 0.45 }}
        >
          <Ionicons name="chevron-forward" size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {pills.map((p) => (
          <Pressable
            key={p}
            onPress={() => submit(p)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 100,
              backgroundColor: surfaces.mutedChipBackground,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: surfaces.mutedChipForeground,
              }}
            >
              {p}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};
