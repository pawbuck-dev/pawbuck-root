import { ChatMessage } from "@/components/chat/ChatMessage";
import { getMiloChatTokens } from "@/components/chat/miloUiTokens";
import type { JournalDomain } from "@/constants/petJournal";
import { useAuth } from "@/context/authContext";
import { useSubscription } from "@/context/subscriptionContext";
import { ChatMessage as CM } from "@/context/chatContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { fetchPetAllergies, fetchPetConditions } from "@/services/petJournal";
import type { PetLogSeverity } from "@/types/petLog";
import {
  appendPetLog,
  syncPetLogToServer,
} from "@/utils/miloJournalStorage";
import {
  fetchMiloChat,
  submitMiloJournalFeedback,
  SubscriptionRequiredError,
} from "@/utils/miloChatApi";
import { getOfflineJournalTurn } from "@/utils/miloJournalOffline";
import {
  extractPetLogEntry,
  severityFromConversationText,
  type TriageContext,
} from "@/utils/miloTriage";
import PremiumFeatureLocked from "@/components/subscription/PremiumFeatureLocked";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MILO_CHAT_BG_LIGHT = require("@/assets/icons/Milo-Light.png");
const MILO_CHAT_BG_DARK = require("@/assets/icons/Milo-Dark.png");

type Row = CM & {
  severity?: PetLogSeverity;
  suggestedReplies?: string[];
  journalSessionComplete?: boolean;
  /** True when answer came from local offline script (API unreachable). */
  offlineFallback?: boolean;
  responseId?: string;
  feedbackRating?: "up" | "down";
};

export default function MiloJournalChatScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const tokens = useMemo(() => getMiloChatTokens(theme, isDark), [theme, isDark]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { canAccessFeature, isLoading: subLoading, openPaywall } = useSubscription();
  const canUseMilo = canAccessFeature("milo_chat");
  const { pets } = usePets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    pet?: string;
    context?: string;
    journalDomain?: string;
  }>();

  const petId = params.pet ? String(params.pet) : null;
  const pet = pets.find((p) => p.id === petId) ?? null;
  const journalDomain = (params.journalDomain as JournalDomain) || "health";

  const { data: allergyRows = [] } = useQuery({
    queryKey: ["pet_allergies_triage", petId],
    queryFn: () => fetchPetAllergies(petId!),
    enabled: !!petId,
  });
  const { data: conditionRows = [] } = useQuery({
    queryKey: ["pet_conditions_triage", petId],
    queryFn: () => fetchPetConditions(petId!),
    enabled: !!petId,
  });

  const triageCtx: TriageContext = {
    allergies: allergyRows.map((a) => a.label).filter(Boolean),
    conditions: conditionRows.map((c) => c.name).filter(Boolean),
  };

  const [messages, setMessages] = useState<Row[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [offlineJournalActive, setOfflineJournalActive] = useState(false);
  const autoSentRef = useRef(false);
  const listRef = useRef<FlatList>(null);

  const lastMessage = messages[messages.length - 1];
  const showJournalChips =
    !busy &&
    lastMessage?.role === "assistant" &&
    (lastMessage.suggestedReplies?.length ?? 0) > 0 &&
    !lastMessage.journalSessionComplete;

  const pushAssistant = useCallback(
    (
      content: string,
      severity: PetLogSeverity,
      extras?: {
        suggestedReplies?: string[];
        journalSessionComplete?: boolean;
        offlineFallback?: boolean;
        responseId?: string;
      }
    ) => {
      const m: Row = {
        id: `${Date.now()}-a`,
        role: "assistant",
        content,
        timestamp: new Date(),
        severity,
        suggestedReplies: extras?.suggestedReplies,
        journalSessionComplete: extras?.journalSessionComplete,
        offlineFallback: extras?.offlineFallback,
        responseId: extras?.responseId,
      };
      setMessages((prev) => [...prev, m]);
    },
    []
  );

  const onJournalFeedback = useCallback(
    async (messageId: string, responseId: string, rating: "up" | "down") => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedbackRating: rating } : m))
      );
      try {
        await submitMiloJournalFeedback({ responseId, rating });
      } catch (e) {
        console.warn("Journal feedback failed:", e);
      }
    },
    []
  );

  const persistJournalEntry = useCallback(
    async (userTurns: string[]) => {
      if (!pet || !user) return;
      const combined = userTurns.join("\n");
      const entry = extractPetLogEntry(
        combined,
        pet.id,
        user.id,
        journalDomain,
        triageCtx
      );
      await appendPetLog(user.id, entry);
      try {
        await syncPetLogToServer(entry);
        await queryClient.invalidateQueries({ queryKey: ["pet_journal"] });
      } catch (e) {
        console.warn("Milo journal sync to server failed (offline ok):", e);
      }
    },
    [pet, user, journalDomain, triageCtx, queryClient]
  );

  const handleSend = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || !pet || !user) return;

      setBusy(true);
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const userMsg: Row = {
        id: `${Date.now()}-u`,
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const priorUserLines = messages.filter((m) => m.role === "user").map((m) => m.content);
      const userTurns = [...priorUserLines, text];
      const severityForTurn = severityFromConversationText(userTurns, triageCtx);

      try {
        const result = await fetchMiloChat({
          message: text,
          pet,
          history,
          journalMode: true,
        });

        setOfflineJournalActive(false);

        pushAssistant(result.answer, severityForTurn, {
          suggestedReplies: result.suggestedReplies,
          journalSessionComplete: result.journalSessionComplete,
          responseId: result.responseId,
        });

        if (result.journalSessionComplete) {
          await persistJournalEntry(userTurns);
        }
      } catch (e) {
        if (e instanceof SubscriptionRequiredError) {
          openPaywall("milo_journal_chat");
          return;
        }
        console.warn("Milo journal chat API failed; using offline journal flow:", e);
        setOfflineJournalActive(true);
        const offline = getOfflineJournalTurn(priorUserLines.length, pet.name);
        pushAssistant(offline.answer, severityForTurn, {
          suggestedReplies: offline.suggestedReplies,
          journalSessionComplete: offline.journalSessionComplete,
          offlineFallback: true,
        });
        if (offline.journalSessionComplete) {
          await persistJournalEntry(userTurns);
        }
      } finally {
        setBusy(false);
      }
    },
    [pet, user, journalDomain, triageCtx, pushAssistant, messages, persistJournalEntry, openPaywall]
  );

  useEffect(() => {
    if (subLoading || !canUseMilo) return;
    const ctx = params.context ? String(params.context) : "";
    if (!ctx || !pet || autoSentRef.current) return;
    autoSentRef.current = true;
    let decoded = ctx;
    try {
      decoded = decodeURIComponent(ctx);
    } catch {
      /* use raw */
    }
    void handleSend(decoded);
  }, [params.context, pet, handleSend, subLoading, canUseMilo]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  const openMessagesCompose = (userObservation: string) => {
    if (!pet) return;
    const body = `Hi — update on ${pet.name}:\n\n${userObservation}\n\n(Sent from PawBuck journal)`;
    router.push({
      pathname: "/(home)/messages",
      params: {
        composeMessage: encodeURIComponent(body),
        composePetId: pet.id,
      },
    } as any);
  };

  const renderJournalFeedback = (m: Row) => {
    if (m.role !== "assistant" || m.offlineFallback || !m.responseId) return null;
    const active = m.feedbackRating;
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginLeft: 56,
          marginBottom: 8,
          gap: 16,
        }}
      >
        <Text style={{ fontSize: 12, color: theme.secondary }}>Was this helpful?</Text>
        <TouchableOpacity
          onPress={() => void onJournalFeedback(m.id, m.responseId!, "up")}
          hitSlop={8}
          accessibilityLabel="Thumbs up"
        >
          <Ionicons
            name="thumbs-up"
            size={20}
            color={active === "up" ? theme.primary : theme.secondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void onJournalFeedback(m.id, m.responseId!, "down")}
          hitSlop={8}
          accessibilityLabel="Thumbs down"
        >
          <Ionicons
            name="thumbs-down"
            size={20}
            color={active === "down" ? "#b91c1c" : theme.secondary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderActions = (m: Row, index: number) => {
    if (m.role !== "assistant" || !m.severity) return null;
    if (index !== messages.length - 1) return null;

    const midFlowChips = (m.suggestedReplies?.length ?? 0) > 0 && !m.journalSessionComplete;
    if (midFlowChips && m.severity !== "urgent") return null;

    let obs = "";
    for (let i = index - 1; i >= 0; i--) {
      const row = messages[i];
      if (row && row.role === "user") {
        obs = row.content;
        break;
      }
    }

    if (midFlowChips && m.severity === "urgent") {
      return (
        <View style={{ marginLeft: 56, marginBottom: 8, maxWidth: "92%" }}>
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: "rgba(239,68,68,0.2)",
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#991b1b" }}>
              Possible emergency — seek immediate veterinary or ER care if your pet is in distress.
            </Text>
          </View>
        </View>
      );
    }

    if (m.journalSessionComplete) {
      const loggedBadge = (
        <View
          style={{
            alignSelf: "flex-start",
            marginLeft: 56,
            marginTop: 4,
            marginBottom: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: "rgba(34,197,94,0.2)",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#15803d" }}>Logged</Text>
        </View>
      );

      switch (m.severity) {
        case "low":
          return loggedBadge;
        case "medium":
          return (
            <View style={{ marginLeft: 56, marginBottom: 8 }}>
              {loggedBadge}
              <TouchableOpacity
                style={{
                  alignSelf: "flex-start",
                  marginTop: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: "rgba(245,158,11,0.2)",
                }}
                onPress={() =>
                  Alert.alert(
                    "Flag for vet",
                    "We’ll remind you to mention this at the next visit. Continue monitoring symptoms.",
                    [{ text: "OK" }]
                  )
                }
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#b45309" }}>
                  Flag for next vet visit
                </Text>
              </TouchableOpacity>
            </View>
          );
        case "high":
          return (
            <View style={{ marginLeft: 56, marginBottom: 8 }}>
              {loggedBadge}
              <TouchableOpacity
                style={{
                  alignSelf: "flex-start",
                  marginTop: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: "rgba(239,68,68,0.15)",
                }}
                onPress={() => openMessagesCompose(obs)}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#b91c1c" }}>
                  Send symptoms to vet
                </Text>
              </TouchableOpacity>
            </View>
          );
        case "urgent":
          return (
            <View style={{ marginLeft: 56, marginBottom: 12, maxWidth: "92%" }}>
              {loggedBadge}
              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: "rgba(239,68,68,0.2)",
                  marginTop: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#991b1b" }}>
                  Possible emergency — seek immediate veterinary or ER care if your pet is in distress.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Emergency",
                    "If this is life-threatening, call your nearest emergency veterinary clinic now. For human emergencies, call local emergency services.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Call help",
                        onPress: () => {
                          void Linking.openURL("tel:911").catch(() => {});
                        },
                      },
                    ]
                  );
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: "#dc2626",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
                  Emergency help (911)
                </Text>
              </TouchableOpacity>
            </View>
          );
        default:
          return loggedBadge;
      }
    }

    switch (m.severity) {
      case "low":
        return (
          <View
            style={{
              alignSelf: "flex-start",
              marginLeft: 56,
              marginTop: 4,
              marginBottom: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: "rgba(34,197,94,0.2)",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#15803d" }}>Logged</Text>
          </View>
        );
      case "medium":
        return (
          <TouchableOpacity
            style={{
              alignSelf: "flex-start",
              marginLeft: 56,
              marginBottom: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: "rgba(245,158,11,0.2)",
            }}
            onPress={() =>
              Alert.alert(
                "Flag for vet",
                "We’ll remind you to mention this at the next visit. Continue monitoring symptoms.",
                [{ text: "OK" }]
              )
            }
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#b45309" }}>
              Flag for next vet visit
            </Text>
          </TouchableOpacity>
        );
      case "high":
        return (
          <TouchableOpacity
            style={{
              alignSelf: "flex-start",
              marginLeft: 56,
              marginBottom: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: "rgba(239,68,68,0.15)",
            }}
            onPress={() => openMessagesCompose(obs)}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#b91c1c" }}>
              Send symptoms to vet
            </Text>
          </TouchableOpacity>
        );
      case "urgent":
        return (
          <View style={{ marginLeft: 56, marginBottom: 12, maxWidth: "92%" }}>
            <View
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: "rgba(239,68,68,0.2)",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#991b1b" }}>
                Possible emergency — seek immediate veterinary or ER care if your pet is in distress.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Emergency",
                  "If this is life-threatening, call your nearest emergency veterinary clinic now. For human emergencies, call local emergency services.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Call help",
                      onPress: () => {
                        void Linking.openURL("tel:911").catch(() => {});
                      },
                    },
                  ]
                );
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: "#dc2626",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
                Emergency help (911)
              </Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  if (!petId || !pet) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}
      >
        <Text style={{ color: theme.secondary }}>Select a pet from the journal first.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.primary, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (subLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (!canUseMilo) {
    return (
      <PremiumFeatureLocked title="Milo" onGoBack={() => router.back()} feature="milo_journal_screen" />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image
          source={isDark ? MILO_CHAT_BG_DARK : MILO_CHAT_BG_LIGHT}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: insets.top + 8,
          paddingBottom: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDark ? theme.card : "rgba(0,0,0,0.06)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={22} color={theme.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: theme.foreground }}>New Chat</Text>
          <Text style={{ fontSize: 12, color: theme.secondary }} numberOfLines={1}>
            Talking about {pet.name}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Milo",
              "Milo offers general wellness information, not a diagnosis. Contact your veterinarian for medical concerns."
            )
          }
          hitSlop={12}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDark ? theme.card : "rgba(0,0,0,0.06)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="menu" size={22} color={theme.foreground} />
        </TouchableOpacity>
      </View>

      {offlineJournalActive ? (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 8,
            padding: 10,
            borderRadius: 10,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
          }}
        >
          <Text style={{ fontSize: 12, lineHeight: 17, color: theme.secondary }}>
            Cannot reach Milo (API offline). You are in a guided journal on this device. Run PawBuck.API and set
            EXPO_PUBLIC_PAWBUCK_API_URL, then restart Expo for full AI chat.
          </Text>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item, index }) => (
          <View>
            <ChatMessage message={item} isNew={index === messages.length - 1} />
            {renderJournalFeedback(item)}
            {renderActions(item, index)}
          </View>
        )}
        ListFooterComponent={
          busy ? (
            <ActivityIndicator style={{ marginTop: 8 }} color={theme.primary} />
          ) : null
        }
      />

      {showJournalChips && lastMessage?.suggestedReplies ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ marginBottom: 8 }}
          contentContainerStyle={{
            flexDirection: "row",
            gap: 8,
            paddingHorizontal: 16,
            paddingBottom: 4,
            alignItems: "center",
          }}
        >
          {lastMessage.suggestedReplies.map((label) => (
            <Pressable
              key={label}
              onPress={() => {
                void handleSend(label);
                setInput("");
              }}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 18,
                backgroundColor: tokens.chipBg,
                borderWidth: 1,
                borderColor: tokens.chipBorder,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: tokens.textPrimary,
                }}
                numberOfLines={2}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View
        style={{
          paddingHorizontal: 12,
          paddingBottom: insets.bottom + 12,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.9)",
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={`Tell Milo about ${pet.name}...`}
          placeholderTextColor={theme.secondary}
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 120,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 22,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            color: theme.foreground,
          }}
          multiline
        />
        <Pressable
          onPress={() => {
            void handleSend(input);
            setInput("");
          }}
          disabled={busy || !input.trim()}
          style={{ marginLeft: 8, opacity: input.trim() && !busy ? 1 : 0.4 }}
        >
          <Ionicons name="send" size={26} color={theme.primary} />
        </Pressable>
      </View>
    </View>
  );
}
