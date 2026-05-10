import { ChatMessage } from "@/components/chat/ChatMessage";
import { MiloStarterSuggestionPill } from "@/components/chat/MiloStarterSuggestionPill";
import { getMiloChatTokens } from "@/components/chat/miloUiTokens";
import type { JournalDomain } from "@/constants/petJournal";
import { useAuth } from "@/context/authContext";
import { useSubscription } from "@/context/subscriptionContext";
import { ChatMessage as CM } from "@/context/chatContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import {
  MILO_TRIAGE_DISCLAIMER_BODY,
  MILO_TRIAGE_DISCLAIMER_TITLE,
} from "@/constants/miloDisclaimers";
import {
  fetchJournalEntries,
  fetchPetAllergies,
  fetchPetConditions,
} from "@/services/petJournal";
import {
  hasAcceptedMiloTriageDisclaimer,
  setAcceptedMiloTriageDisclaimer,
} from "@/services/miloTriageDisclaimer";
import type { PetLogSeverity } from "@/types/petLog";
import {
  appendPetLog,
  syncPetLogToServer,
} from "@/utils/miloJournalStorage";
import {
  fetchMiloChat,
  submitMiloJournalFeedback,
  SubscriptionRequiredError,
  type MiloChatFileAttachment,
} from "@/utils/miloChatApi";
import { miloHiGreetingSuffixFromUser } from "@/utils/userDisplayIdentity";
import { getOfflineJournalTurn } from "@/utils/miloJournalOffline";
import {
  extractPetLogEntry,
  severityFromConversationText,
  type TriageContext,
} from "@/utils/miloTriage";
import {
  buildMiloSuggestedPrompts,
  MILO_EMPTY_THREAD_PROMPT_COUNT,
} from "@/services/miloSuggestedPrompts";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import PremiumFeatureLocked from "@/components/subscription/PremiumFeatureLocked";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type JournalNavTarget = {
  entryId: string;
  kind: "server" | "milo";
  domain: JournalDomain;
};

type Row = CM & {
  severity?: PetLogSeverity;
  suggestedReplies?: string[];
  journalSessionComplete?: boolean;
  /** Populated after journal row is saved (local and/or server) so the UI can deep-link to Pet Journal. */
  journalNavTarget?: JournalNavTarget;
  /** True when answer came from local offline script (API unreachable). */
  offlineFallback?: boolean;
  turnId?: string;
  /** @deprecated use turnId */
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
  /** One-time acknowledgment before first journal triage on this device (per user). */
  const [triageDisclaimerStatus, setTriageDisclaimerStatus] = useState<"loading" | "pending" | "accepted">(
    "loading"
  );
  const autoSentRef = useRef(false);
  const listRef = useRef<FlatList>(null);
  /** Prevents duplicate Milo journal rows when persist runs twice for the same triage fingerprint. */
  const miloPersistInflightRef = useRef<string | null>(null);

  const rotationSeed = `${user?.id ?? ""}|${pet?.id ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        if (!cancelled) setTriageDisclaimerStatus("accepted");
        return;
      }
      try {
        const ok = await hasAcceptedMiloTriageDisclaimer(user.id);
        if (!cancelled) setTriageDisclaimerStatus(ok ? "accepted" : "pending");
      } catch {
        if (!cancelled) setTriageDisclaimerStatus("pending");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const { data: starterData } = useQuery({
    queryKey: ["miloJournalStarters", pet?.id],
    queryFn: async () => {
      const pid = pet!.id;
      const [vaccinations, journalEntries] = await Promise.all([
        getVaccinationsByPetId(pid),
        fetchJournalEntries(pid, "health"),
      ]);
      return { vaccinations, journalEntries };
    },
    enabled: !!pet?.id,
  });

  const suggestedStarters = useMemo(
    () =>
      buildMiloSuggestedPrompts({
        petName: pet?.name ?? null,
        vaccinations: starterData?.vaccinations ?? [],
        journalEntries: starterData?.journalEntries ?? [],
        maxCount: MILO_EMPTY_THREAD_PROMPT_COUNT,
        rotationSeed,
      }),
    [pet?.name, starterData?.vaccinations, starterData?.journalEntries, rotationSeed]
  );

  const miloGreetingSuffix = useMemo(() => miloHiGreetingSuffixFromUser(user ?? undefined), [user]);

  // Scroll when keyboard is visible; avoid translating the composer (breaks iOS keyboard on device).
  useEffect(() => {
    const scrollEnd = () => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    };
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardDidShow" : "keyboardDidShow",
      scrollEnd
    );
    return () => showSub.remove();
  }, []);

  const lastMessage = messages[messages.length - 1];
  const showJournalChips =
    !busy &&
    lastMessage?.role === "assistant" &&
    (lastMessage.suggestedReplies?.length ?? 0) > 0 &&
    !lastMessage.journalSessionComplete;

  /** Thumbs-up/down only on the latest journal-complete assistant turn (not on every CONTINUE reply). */
  const journalFeedbackRowIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const row = messages[i];
      if (row.role === "assistant" && row.journalSessionComplete) return i;
    }
    return -1;
  }, [messages]);

  const pushAssistant = useCallback(
    (
      content: string,
      severity: PetLogSeverity,
      extras?: {
        suggestedReplies?: string[];
        journalSessionComplete?: boolean;
        offlineFallback?: boolean;
        turnId?: string;
        responseId?: string;
        fileAttachments?: MiloChatFileAttachment[];
      }
    ): string => {
      const tid = extras?.turnId ?? extras?.responseId;
      const id = `${Date.now()}-a`;
      const m: Row = {
        id,
        role: "assistant",
        content,
        timestamp: new Date(),
        severity,
        suggestedReplies: extras?.suggestedReplies,
        journalSessionComplete: extras?.journalSessionComplete,
        offlineFallback: extras?.offlineFallback,
        turnId: tid,
        responseId: tid,
        fileAttachments: extras?.fileAttachments,
      };
      setMessages((prev) => [...prev, m]);
      return id;
    },
    []
  );

  const onJournalFeedback = useCallback(
    async (messageId: string, turnId: string, rating: "up" | "down") => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedbackRating: rating } : m))
      );
      try {
        await submitMiloJournalFeedback({ turnId, rating });
      } catch (e) {
        console.warn("Journal feedback failed:", e);
      }
    },
    []
  );

  const persistJournalEntry = useCallback(
    async (userTurns: string[], journalSummary?: string | null): Promise<JournalNavTarget | null> => {
      if (!pet || !user) return null;
      const combined = userTurns.join("\n");
      const finalNote = journalSummary?.trim() || combined;
      const entry = extractPetLogEntry(
        finalNote,
        pet.id,
        user.id,
        journalDomain,
        triageCtx,
        combined
      );
      const idem = entry.milo_idempotency_key;
      if (idem) {
        if (miloPersistInflightRef.current === idem) return null;
        miloPersistInflightRef.current = idem;
      }
      let nav: JournalNavTarget | null = null;
      try {
        await appendPetLog(user.id, entry);
        try {
          const serverId = await syncPetLogToServer(entry);
          await queryClient.invalidateQueries({ queryKey: ["pet_journal"] });
          nav = serverId
            ? { entryId: serverId, kind: "server", domain: entry.domain }
            : { entryId: entry.id, kind: "milo", domain: entry.domain };
        } catch (e) {
          console.warn("Milo journal sync to server failed (offline ok):", e);
          nav = { entryId: entry.id, kind: "milo", domain: entry.domain };
        }
      } finally {
        if (idem && miloPersistInflightRef.current === idem) {
          miloPersistInflightRef.current = null;
        }
      }
      return nav;
    },
    [pet, user, journalDomain, triageCtx, queryClient]
  );

  const handleSend = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || !pet || !user) return;
      if (triageDisclaimerStatus !== "accepted") return;

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

        const assistantMsgId = pushAssistant(result.answer, severityForTurn, {
          suggestedReplies: result.suggestedReplies,
          journalSessionComplete: result.journalSessionComplete,
          turnId: result.turnId ?? result.responseId,
          fileAttachments: result.fileAttachments,
        });

        if (result.journalSessionComplete) {
          const nav = await persistJournalEntry(userTurns, result.journalSummary);
          if (nav) {
            setMessages((prev) =>
              prev.map((row) => (row.id === assistantMsgId ? { ...row, journalNavTarget: nav } : row))
            );
          }
        }
      } catch (e) {
        if (e instanceof SubscriptionRequiredError) {
          openPaywall("milo_journal_chat");
          return;
        }
        console.warn("Milo journal chat API failed; using offline journal flow:", e);
        setOfflineJournalActive(true);
        const offline = getOfflineJournalTurn(priorUserLines.length, pet.name);
        const assistantMsgId = pushAssistant(offline.answer, severityForTurn, {
          suggestedReplies: offline.suggestedReplies,
          journalSessionComplete: offline.journalSessionComplete,
          offlineFallback: true,
        });
        if (offline.journalSessionComplete) {
          const nav = await persistJournalEntry(userTurns, null);
          if (nav) {
            setMessages((prev) =>
              prev.map((row) => (row.id === assistantMsgId ? { ...row, journalNavTarget: nav } : row))
            );
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [
      pet,
      user,
      journalDomain,
      triageCtx,
      pushAssistant,
      messages,
      persistJournalEntry,
      openPaywall,
      triageDisclaimerStatus,
    ]
  );

  useEffect(() => {
    if (subLoading || !canUseMilo) return;
    if (triageDisclaimerStatus !== "accepted") return;
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
  }, [params.context, pet, handleSend, subLoading, canUseMilo, triageDisclaimerStatus]);

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

  const openJournalEntry = useCallback(
    (nav: JournalNavTarget) => {
      if (!pet) return;
      router.push({
        pathname: "/(home)/pet-journal",
        params: {
          petId: pet.id,
          domain: nav.domain,
          focusEntryId: nav.entryId,
          focusKind: nav.kind,
        },
      } as any);
    },
    [pet, router]
  );

  const renderJournalFeedback = (m: Row, index: number) => {
    const tid = m.turnId ?? m.responseId;
    if (m.role !== "assistant" || m.offlineFallback || !tid) return null;
    if (index !== journalFeedbackRowIndex) return null;
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
          onPress={() => void onJournalFeedback(m.id, tid, "up")}
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
          onPress={() => void onJournalFeedback(m.id, tid, "down")}
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
      const savedToJournalCta = (
        <TouchableOpacity
          disabled={!m.journalNavTarget}
          onPress={() => m.journalNavTarget && openJournalEntry(m.journalNavTarget)}
          style={{
            alignSelf: "flex-start",
            marginLeft: 56,
            marginTop: 4,
            marginBottom: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: "rgba(34,197,94,0.2)",
            opacity: m.journalNavTarget ? 1 : 0.55,
          }}
          accessibilityRole="button"
          accessibilityLabel={
            m.journalNavTarget ? "Saved to journal, open entry" : "Saving entry to journal"
          }
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#15803d" }}>Saved to Journal →</Text>
        </TouchableOpacity>
      );

      switch (m.severity) {
        case "low":
          return savedToJournalCta;
        case "medium":
          return (
            <View style={{ marginLeft: 56, marginBottom: 8 }}>
              {savedToJournalCta}
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
              {savedToJournalCta}
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
              {savedToJournalCta}
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
          return savedToJournalCta;
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 58 : 0}
      >
        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={messages}
          keyExtractor={(item) => item.id}
          removeClippedSubviews={false}
          contentContainerStyle={
            messages.length === 0 ? { paddingBottom: 16, flexGrow: 1 } : { paddingBottom: 16 }
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          renderItem={({ item, index }) => (
            <View>
              <ChatMessage message={item} isNew={index === messages.length - 1} />
              {renderJournalFeedback(item, index)}
              {renderActions(item, index)}
            </View>
          )}
          ListEmptyComponent={
            busy ? (
              <View style={{ paddingTop: 40, alignItems: "center" }}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : (
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 16,
                  paddingBottom: 24,
                  alignSelf: "stretch",
                  width: "100%",
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: "700", color: theme.foreground }}>
                  Hi{miloGreetingSuffix}!
                </Text>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "800",
                    color: theme.foreground,
                    marginTop: 6,
                    marginBottom: 16,
                  }}
                >
                  Where should we start?
                </Text>
                {suggestedStarters.map((q) => (
                  <MiloStarterSuggestionPill
                    key={q}
                    label={q}
                    mode={isDark ? "dark" : "light"}
                    fill={tokens.composerBg}
                    stroke={tokens.composerBorder}
                    textColor={tokens.textPrimary}
                    screenHorizontalPaddingPx={20}
                    onPress={() => {
                      void handleSend(q);
                      setInput("");
                    }}
                  />
                ))}
              </View>
            )
          }
          ListFooterComponent={
            messages.length > 0 && busy ? (
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
                paddingHorizontal: 16,
                borderRadius: 9999,
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
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 12),
            flexDirection: "row",
            alignItems: "flex-end",
            backgroundColor: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.9)",
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={`Tell Milo about ${pet.name}...`}
            placeholderTextColor={tokens.placeholder}
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              paddingHorizontal: 14,
              paddingVertical: Platform.OS === "ios" ? 10 : 12,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: tokens.composerBorder,
              backgroundColor: tokens.composerBg,
              color: tokens.textPrimary,
              fontSize: 16,
              lineHeight: 22,
            }}
            multiline
            showSoftInputOnFocus
            editable={triageDisclaimerStatus === "accepted"}
            keyboardAppearance={isDark ? "dark" : "light"}
            {...(Platform.OS === "android" ? { textAlignVertical: "top" as const } : {})}
          />
          <Pressable
            onPress={() => {
              void handleSend(input);
              setInput("");
            }}
            disabled={busy || !input.trim() || triageDisclaimerStatus !== "accepted"}
            style={{
              marginLeft: 8,
              marginBottom: 6,
              opacity: input.trim() && !busy && triageDisclaimerStatus === "accepted" ? 1 : 0.4,
            }}
          >
            <Ionicons name="send" size={26} color={theme.primary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={triageDisclaimerStatus === "pending"} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            paddingHorizontal: 20,
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 24),
          }}
        >
          <View
            style={{
              maxHeight: "88%",
              borderRadius: 16,
              backgroundColor: theme.card,
              padding: 20,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", color: theme.foreground, marginBottom: 12 }}>
              {MILO_TRIAGE_DISCLAIMER_TITLE}
            </Text>
            <ScrollView
              style={{ maxHeight: 360 }}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              <Text style={{ fontSize: 14, lineHeight: 21, color: theme.foreground }}>{MILO_TRIAGE_DISCLAIMER_BODY}</Text>
            </ScrollView>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Accept Milo health journal disclaimer"
              onPress={() => {
                if (!user?.id) return;
                void (async () => {
                  await setAcceptedMiloTriageDisclaimer(user.id);
                  setTriageDisclaimerStatus("accepted");
                })();
              }}
              style={{
                marginTop: 18,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: theme.primary,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>I understand and accept</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12, paddingVertical: 10 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.secondary, textAlign: "center" }}>
                Go back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
