import type { JournalDomain } from "@/constants/petJournal";
import type { Pet } from "@/context/petsContext";
import { useSubscription } from "@/context/subscriptionContext";
import { useTheme } from "@/context/themeContext";
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
  health: ["Lethargic today", "Changed appetite", "Vomiting or diarrhea", "Scratching a lot"],
  behavioral: ["Unusual barking", "More anxious", "Hiding", "Hyperactive"],
  environmental: ["Changed food brand", "New pet at home", "Travel stress", "Weather change"],
};

export interface MiloJournalBarProps {
  pet: Pet;
  domain: JournalDomain;
}

export const MiloJournalBar: React.FC<MiloJournalBarProps> = ({ pet, domain }) => {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const { ensurePremium } = useSubscription();
  const [draft, setDraft] = useState("");

  const pills = useMemo(() => QUICK_PROMPTS[domain], [domain]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t) return;
    ensurePremium(() => {
      const encoded = encodeURIComponent(t);
      setDraft("");
      router.push({
        pathname: "/(home)/milo",
        params: { pet: pet.id, context: encoded, journalDomain: domain },
      } as any);
    }, "milo_journal_bar");
  };

  return (
    <View
      style={{
        backgroundColor: isDark ? theme.card : "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <Image
          source={MILO_AVATAR}
          style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }}
          contentFit="cover"
        />
        <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: theme.foreground }}>
          Talk to Milo
        </Text>
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
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.secondary} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={`Tell Milo about ${pet.name}...`}
          placeholderTextColor={theme.secondary}
          style={{
            flex: 1,
            marginLeft: 8,
            fontSize: 15,
            color: theme.foreground,
            paddingVertical: 8,
          }}
          returnKeyType="send"
          onSubmitEditing={() => submit(draft)}
        />
        <TouchableOpacity
          onPress={() => submit(draft)}
          disabled={!draft.trim()}
          style={{ opacity: draft.trim() ? 1 : 0.4 }}
        >
          <Ionicons name="arrow-forward-circle" size={28} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, marginTop: 10, paddingRight: 8 }}
      >
        {pills.map((p) => (
          <Pressable
            key={p}
            onPress={() => submit(p)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: isDark ? "rgba(59,208,210,0.15)" : "rgba(59,208,210,0.2)",
            }}
          >
            <Text style={{ fontSize: 13, color: theme.foreground }}>{p}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};
