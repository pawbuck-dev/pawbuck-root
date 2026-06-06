import { ChatMessage } from "@/components/chat/ChatMessage";
import { ContextSurfaceBubble } from "@/components/journalInterview/ContextSurfaceBubble";
import { TreeQuestionBubble } from "@/components/journalInterview/TreeQuestionBubble";
import { PostSaveHandoff } from "@/components/journalInterview/PostSaveHandoff";
import { StructuredSummaryCard } from "@/components/journalInterview/StructuredSummaryCard";
import { EmergencyBanner } from "@/components/journalInterview/EmergencyBanner";
import { SummaryEditModal } from "@/components/journalInterview/SummaryEditModal";
import { VetEmailComposer } from "@/components/journalInterview/VetEmailComposer";
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
  fetchActiveJournalSession,
  fetchMiloChat,
  linkJournalSessionEntry,
  submitMiloJournalFeedback,
  type MiloChatFileAttachment,
} from "@/utils/miloChatApi";
import { isPlausibleDisplayNameForGreeting, resolveAuthDisplayName } from "@/services/authDisplayName";
import type { VetMedicalContext, VetNotificationPayload, VetOwnerContact } from "@/types/vetNotification";
import {
  buildVetMessageFromJournalSession,
  buildVetMessageSubject,
  shouldSuppressVetEmailCompose,
  type VetAskKind,
} from "@/utils/buildVetMessageFromJournalSession";
import {
  hasSeenMiloJournalOnboarding,
  setMiloJournalOnboardingSeen,
} from "@/services/miloJournalOnboarding";
import { miloHiGreetingSuffixFromUser } from "@/utils/userDisplayIdentity";
import { getOfflineJournalTurn } from "@/utils/miloJournalOffline";
import { isRoutineJournalLogText } from "@/utils/miloJournalIntent";
import { SubscriptionRequiredError } from "@/utils/miloChatApi";
import {
  extractPetLogEntry,
  severityFromConversationText,
  type TriageContext,
} from "@/utils/miloTriage";
import {
  buildMiloSuggestedPrompts,
  MILO_EMPTY_THREAD_PROMPT_COUNT,
} from "@/services/miloSuggestedPrompts";
import {
  isEditSummaryIntent,
  isTreeInterviewUxEnabled,
  JOURNAL_TREE_INTERVIEW_ENABLED,
  resolveContextSurfaceJournalAction,
  resolveJournalTreeId,
  type JournalContextSurface,
  type JournalCurrentQuestion,
  type JournalInterviewMetadata,
  type JournalInterviewPhase,
  type JournalStructuredSummary,
} from "@/types/journalInterview";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import { pickImageFromLibrary } from "@/utils/imagePicker";
import { uploadFile } from "@/utils/image";
import { useDocumentUploadQuota } from "@/hooks/useDocumentUploadQuota";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
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

const MILO_AVATAR = require("@/assets/images/milo_gif.gif");

function shortTimeZoneAbbrev(): string {
  try {
    return (
      Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? ""
    );
  } catch {
    return "";
  }
}

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
  /** Present when journal session completed (API); used for “Message to vet” prefill. */
  journalSummary?: string;
  /** API Phase 4 red-flag stop — no journal row should be saved. */
  journalEmergencyStop?: boolean;
  /** Structured vet notification from journal Gemini when present. */
  vetNotificationPayload?: VetNotificationPayload | null;
  vetMedicalContext?: VetMedicalContext | null;
  turnId?: string;
  /** @deprecated use turnId */
  responseId?: string;
  feedbackRating?: "up" | "down";
  feedbackReasonPending?: boolean;
  treeVersion?: string;
  questionsAskedCount?: number;
  interviewPhase?: JournalInterviewPhase;
  contextSurface?: JournalContextSurface;
  structuredSummary?: JournalStructuredSummary;
  currentQuestion?: JournalCurrentQuestion;
  emergencyDetected?: boolean;
  treeId?: string;
};

export default function MiloJournalChatScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const tokens = useMemo(() => getMiloChatTokens(theme, isDark), [theme, isDark]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    canStartAiJournal,
    aiJournalEntriesRemaining,
    openPaywall,
    refetchEntitlement,
  } = useSubscription();
  const { ensureDocumentUploadAllowed } = useDocumentUploadQuota();
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
  const [journalFallbackReason, setJournalFallbackReason] = useState<string | null>(null);
  /** One-time acknowledgment before first journal triage on this device (per user). */
  const [triageDisclaimerStatus, setTriageDisclaimerStatus] = useState<"loading" | "pending" | "accepted">(
    "loading"
  );
  const autoSentRef = useRef(false);
  const listRef = useRef<FlatList>(null);
  /** Prevents duplicate Milo journal rows when persist runs twice for the same triage fingerprint. */
  const miloPersistInflightRef = useRef<string | null>(null);
  const journalSessionIdRef = useRef<string | null>(null);
  const pendingJournalTreeIdRef = useRef<string | null>(null);
  const lastTreeVersionRef = useRef<string | undefined>(undefined);
  const lastQuestionsAskedRef = useRef<number | undefined>(undefined);
  const [vetComposerVisible, setVetComposerVisible] = useState(false);
  const [journalOnboardingVisible, setJournalOnboardingVisible] = useState(false);
  const [feedbackReasonForMessageId, setFeedbackReasonForMessageId] = useState<string | null>(null);
  const [treeUxActive, setTreeUxActive] = useState(JOURNAL_TREE_INTERVIEW_ENABLED);
  const [resumeDraft, setResumeDraft] = useState<{
    sessionId: string;
    treeId: string;
    phase: string;
  } | null>(null);
  const [summaryEditVisible, setSummaryEditVisible] = useState(false);
  const [summaryEditFields, setSummaryEditFields] = useState<Record<string, string>>({});
  const pendingAttachmentPathsRef = useRef<string[]>([]);
  const [attachmentCount, setAttachmentCount] = useState(0);

  const JOURNAL_FEEDBACK_DOWN_REASONS = [
    "Wrong questions",
    "Missed something important",
    "Too clinical / hard to read",
    "Didn't match my pet",
    "Other",
  ] as const;

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (triageDisclaimerStatus !== "accepted") return;
      try {
        const seen = await hasSeenMiloJournalOnboarding();
        if (!cancelled && !seen) setJournalOnboardingVisible(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [triageDisclaimerStatus]);

  useEffect(() => {
    if (!pet?.id || triageDisclaimerStatus !== "accepted") return;
    void (async () => {
      const active = await fetchActiveJournalSession(pet.id);
      if (active?.sessionId) {
        setResumeDraft({
          sessionId: active.sessionId,
          treeId: active.treeId,
          phase: active.phase,
        });
      }
    })();
  }, [pet?.id, triageDisclaimerStatus]);

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
  /** Full owner display name for vet email signature (same source as profile-aware flows). */
  const vetMessageOwnerSignature = useMemo(() => {
    const full = resolveAuthDisplayName(user ?? undefined).trim();
    if (full && isPlausibleDisplayNameForGreeting(full)) return full;
    return "Pet parent";
  }, [user]);

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
    !lastMessage.journalSessionComplete &&
    !lastMessage.currentQuestion;

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
        interviewPhase?: JournalInterviewPhase;
        contextSurface?: JournalContextSurface;
        structuredSummary?: JournalStructuredSummary;
        currentQuestion?: JournalCurrentQuestion;
        emergencyDetected?: boolean;
        treeId?: string;
        treeVersion?: string;
        journalSessionComplete?: boolean;
        offlineFallback?: boolean;
        journalSummary?: string;
        journalEmergencyStop?: boolean;
        vetNotificationPayload?: VetNotificationPayload | null;
        vetMedicalContext?: VetMedicalContext | null;
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
        interviewPhase: extras?.interviewPhase,
        contextSurface: extras?.contextSurface,
        structuredSummary: extras?.structuredSummary,
        currentQuestion: extras?.currentQuestion,
        emergencyDetected: extras?.emergencyDetected,
        treeId: extras?.treeId,
        treeVersion: extras?.treeVersion,
        journalSessionComplete: extras?.journalSessionComplete,
        offlineFallback: extras?.offlineFallback,
        journalSummary: extras?.journalSummary,
        journalEmergencyStop: extras?.journalEmergencyStop,
        vetNotificationPayload: extras?.vetNotificationPayload,
        vetMedicalContext: extras?.vetMedicalContext,
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
    async (
      messageId: string,
      turnId: string,
      rating: "up" | "down",
      opts?: { feedbackReason?: string; treeVersion?: string; questionsAsked?: number }
    ) => {
      if (rating === "down" && !opts?.feedbackReason) {
        setFeedbackReasonForMessageId(messageId);
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, feedbackReasonPending: true } : m))
        );
        return;
      }
      setFeedbackReasonForMessageId(null);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, feedbackRating: rating, feedbackReasonPending: false } : m
        )
      );
      try {
        await submitMiloJournalFeedback({
          turnId,
          rating,
          feedbackReason: opts?.feedbackReason,
          treeVersion: opts?.treeVersion ?? lastTreeVersionRef.current,
          questionsAsked: opts?.questionsAsked ?? lastQuestionsAskedRef.current,
          feedbackStage: "journal_chat",
        });
      } catch (e) {
        console.warn("Journal feedback failed:", e);
      }
    },
    []
  );

  const persistJournalEntry = useCallback(
    async (
      userTurns: string[],
      journalSummary?: string | null,
      treeMeta?: {
        structuredSummary?: JournalStructuredSummary | null;
        sessionId?: string | null;
        treeId?: string | null;
        treeVersion?: string | null;
        turnId?: string | null;
      }
    ): Promise<JournalNavTarget | null> => {
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
      if (treeMeta?.structuredSummary && treeMeta.treeId) {
        const meta: JournalInterviewMetadata = {
          tree_id: treeMeta.treeId,
          tree_version: treeMeta.treeVersion ?? "1.5.0",
          structured_fields: treeMeta.structuredSummary.fields,
          ai_confidence: treeMeta.structuredSummary.confidenceScore ?? null,
          source: "ai_tree_v1.5",
          session_id: treeMeta.sessionId ?? undefined,
          turn_id: treeMeta.turnId ?? undefined,
          attachment_paths:
            pendingAttachmentPathsRef.current.length > 0
              ? [...pendingAttachmentPathsRef.current]
              : undefined,
        };
        entry.interview_metadata = meta as unknown as Record<string, unknown>;
      }
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
          const resolvedId = serverId ?? entry.id;
          if (treeMeta?.sessionId && serverId) {
            void linkJournalSessionEntry({
              sessionId: treeMeta.sessionId,
              petId: pet.id,
              journalEntryId: serverId,
            });
          }
          nav = serverId
            ? { entryId: resolvedId, kind: "server", domain: entry.domain }
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

  const openJournalHealthDeepLink = useCallback(
    (kind: "vaccination" | "medication") => {
      if (!pet?.id) return;
      const pid = pet.id;
      ensureDocumentUploadAllowed(() => {
        if (kind === "vaccination") {
          router.push(`/(home)/health-record/${pid}/vaccination-upload-modal?upload=library` as never);
        } else {
          router.push(`/(home)/health-record/${pid}/medication-upload-modal?upload=library` as never);
        }
      });
    },
    [ensureDocumentUploadAllowed, pet?.id, router]
  );

  const openSummaryEditModal = useCallback((fields: Record<string, string>) => {
    setSummaryEditFields({ ...fields });
    setSummaryEditVisible(true);
  }, []);

  const handleSend = useCallback(
    async (raw: string, chipIds?: string[], explicitJournalAction?: string) => {
      const text = raw.trim();
      if (!text || !pet || !user) return;
      if (triageDisclaimerStatus !== "accepted") return;

      const lastAssistantBeforeSend = [...messages].reverse().find((m) => m.role === "assistant");
      const summaryDraftBeforeSend =
        lastAssistantBeforeSend?.interviewPhase === "summary_draft" &&
        lastAssistantBeforeSend.structuredSummary;
      if (summaryDraftBeforeSend && isEditSummaryIntent(text)) {
        openSummaryEditModal(lastAssistantBeforeSend!.structuredSummary!.fields);
        return;
      }

      const isNewJournalSession = !journalSessionIdRef.current;
      if (isNewJournalSession && !canStartAiJournal) {
        openPaywall({
          source: "ai_journal",
          copyVariant: "ai_journal_entry_cap",
          requiredPlan: "individual",
        });
        void refetchEntitlement();
        return;
      }

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
        const treeId =
          pendingJournalTreeIdRef.current ??
          (treeUxActive || JOURNAL_TREE_INTERVIEW_ENABLED ? resolveJournalTreeId(text) : undefined);
        if (treeId && !journalSessionIdRef.current) {
          pendingJournalTreeIdRef.current = treeId;
        }

        const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
        let journalAction =
          explicitJournalAction ??
          resolveContextSurfaceJournalAction(text, lastAssistant?.contextSurface);

        const lower = text.toLowerCase();
        if (!journalAction) {
          if (lower.includes("looks right") && lower.includes("continue")) {
            journalAction = "context_continue";
          } else if (lower.includes("looks right") && lower.includes("save")) {
            journalAction = "confirm_summary";
          } else if (lower === "skip") {
            journalAction = "answer";
          }
        }

        const result = await fetchMiloChat({
          message: text,
          pet,
          history,
          journalMode: true,
          journalTreeId: treeId,
          journalSessionId: journalSessionIdRef.current ?? undefined,
          journalAction,
          journalChipIds: chipIds,
        });

        if (result.journalSessionId) {
          journalSessionIdRef.current = result.journalSessionId;
          pendingJournalTreeIdRef.current = null;
        }
        if (result.treeVersion) lastTreeVersionRef.current = result.treeVersion;
        if (result.questionsAskedCount != null) {
          lastQuestionsAskedRef.current = result.questionsAskedCount;
        }
        if (isTreeInterviewUxEnabled(JOURNAL_TREE_INTERVIEW_ENABLED, result.treeId, result.interviewPhase)) {
          setTreeUxActive(true);
        }

        setOfflineJournalActive(false);
        setJournalFallbackReason(null);

        const severityOut =
          result.journalEmergencyStop === true || result.emergencyDetected
            ? ("urgent" as PetLogSeverity)
            : severityForTurn;

        if (result.journalHealthDeepLink) {
          openJournalHealthDeepLink(result.journalHealthDeepLink);
        }

        const assistantMsgId = pushAssistant(result.answer, severityOut, {
          suggestedReplies: result.suggestedReplies,
          interviewPhase: result.interviewPhase,
          contextSurface: result.contextSurface,
          structuredSummary: result.structuredSummary,
          currentQuestion: result.currentQuestion,
          emergencyDetected: result.emergencyDetected,
          treeId: result.treeId,
          treeVersion: result.treeVersion,
          journalSessionComplete: result.journalSessionComplete,
          journalSummary: result.journalSummary ?? undefined,
          journalEmergencyStop: result.journalEmergencyStop,
          vetNotificationPayload: result.vetNotification ?? undefined,
          vetMedicalContext: result.vetMedicalContext ?? undefined,
          turnId: result.turnId ?? result.responseId,
          fileAttachments: result.fileAttachments,
        });

        if (result.journalSessionComplete && result.journalEmergencyStop !== true) {
          setResumeDraft(null);
          pendingAttachmentPathsRef.current = [];
          setAttachmentCount(0);
          const nav = await persistJournalEntry(userTurns, result.journalSummary, {
            structuredSummary: result.structuredSummary ?? null,
            sessionId: result.journalSessionId ?? journalSessionIdRef.current,
            treeId: result.treeId ?? null,
            treeVersion: result.treeVersion ?? null,
            turnId: result.turnId ?? result.responseId ?? null,
          });
          if (nav) {
            setMessages((prev) =>
              prev.map((row) => (row.id === assistantMsgId ? { ...row, journalNavTarget: nav } : row))
            );
          }
        }
      } catch (e) {
        if (e instanceof SubscriptionRequiredError) {
          setMessages((prev) => prev.slice(0, -1));
          openPaywall({
            source: "ai_journal",
            requiredPlan: e.upgradePlan,
            copyVariant:
              e.code === "ai_journal_entry_cap" ? "ai_journal_entry_cap" : "default",
          });
          void refetchEntitlement();
          setBusy(false);
          return;
        }
        const reason = e instanceof Error ? e.message : "Request failed";
        console.warn("Milo journal chat API failed; using offline journal flow:", e);
        setOfflineJournalActive(true);
        setJournalFallbackReason(reason);
        const offline = getOfflineJournalTurn(userTurns, pet.name);
        const offlineSummary =
          offline.structuredFields?.NOTE ??
          (offline.journalSessionComplete ? userTurns.join("\n") : null);
        const assistantMsgId = pushAssistant(offline.answer, severityForTurn, {
          suggestedReplies: offline.suggestedReplies,
          journalSessionComplete: offline.journalSessionComplete,
          offlineFallback: true,
        });
        if (offline.journalSessionComplete) {
          const nav = await persistJournalEntry(userTurns, offlineSummary);
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
      triageDisclaimerStatus,
      openJournalHealthDeepLink,
      openSummaryEditModal,
      canStartAiJournal,
      openPaywall,
      refetchEntitlement,
    ]
  );

  useEffect(() => {
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
  }, [params.context, pet, handleSend, triageDisclaimerStatus]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  const openVetMessageCompose = useCallback(() => {
    if (!pet || !user) return;
    let lastComplete: Row | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      const row = messages[i];
      if (row.role === "assistant" && row.journalSessionComplete) {
        lastComplete = row;
        break;
      }
    }
    if (shouldSuppressVetEmailCompose(lastComplete?.vetNotificationPayload, lastComplete?.severity)) {
      Alert.alert(
        "Call your veterinary clinic",
        "This session may be urgent. Do not rely on email—call your vet or an emergency clinic now. Your observations are saved in the journal so you can read them during the call.",
        [{ text: "OK" }]
      );
      return;
    }
    setVetComposerVisible(true);
  }, [pet, user, messages]);

  const applySummaryEdits = useCallback(
    async (fields: Record<string, string>) => {
      setSummaryEditVisible(false);
      if (!pet || !user) return;
      setBusy(true);
      try {
        const result = await fetchMiloChat({
          message: "Edit summary",
          pet,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          journalMode: true,
          journalSessionId: journalSessionIdRef.current ?? undefined,
          journalAction: "edit_summary",
          journalSummaryFields: fields,
        });
        pushAssistant(result.answer, "medium", {
          structuredSummary: result.structuredSummary,
          interviewPhase: result.interviewPhase,
          treeId: result.treeId,
          treeVersion: result.treeVersion,
          emergencyDetected: result.emergencyDetected,
          turnId: result.turnId ?? result.responseId,
        });
      } catch (e) {
        console.warn("Summary edit failed:", e);
        Alert.alert("Could not apply edits", "Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [pet, user, messages, pushAssistant]
  );

  const attachSummaryPhoto = useCallback(async () => {
    if (!pet || !user) return;
    const asset = await pickImageFromLibrary();
    if (!asset) return;
    try {
      const ext = asset.mimeType?.split("/")[1] ?? "jpg";
      const safeName = pet.name.split(" ").join("_");
      const storagePath = `${user.id}/pet_${safeName}_${pet.id}/journal/${Date.now()}.${ext}`;
      const data = await uploadFile(asset, storagePath);
      pendingAttachmentPathsRef.current = [...pendingAttachmentPathsRef.current, data.path];
      setAttachmentCount(pendingAttachmentPathsRef.current.length);
    } catch (e) {
      console.warn("Journal photo attach failed:", e);
      Alert.alert("Upload failed", "Could not attach the photo. You can still save without it.");
    }
  }, [pet, user]);

  const completeVetMessageCompose = useCallback(
    (vetAsk: VetAskKind, recipientEmail?: string) => {
      setVetComposerVisible(false);
      if (!pet || !user) return;
      let lastComplete: Row | undefined;
      for (let i = messages.length - 1; i >= 0; i--) {
        const row = messages[i];
        if (row.role === "assistant" && row.journalSessionComplete) {
          lastComplete = row;
          break;
        }
      }
      const userTurns = messages.filter((m) => m.role === "user").map((m) => m.content);
    const journalSummary = lastComplete?.journalSummary?.trim() ?? null;
    const sessionDateLabel = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const ownerPhoneRaw =
      (typeof meta.phone === "string" && meta.phone) ||
      (typeof meta.phone_number === "string" && meta.phone_number) ||
      undefined;
    const vetOwnerContact: VetOwnerContact | undefined = {
      email: user.email ?? undefined,
      phone: ownerPhoneRaw,
      preferredContactLine: "Email reply",
    };
    const journalRecordId = lastComplete?.journalNavTarget?.entryId ?? pet.id;
    const logIsoTimestamp = new Date().toISOString();
    const tz = shortTimeZoneAbbrev();
    const composeInput = {
      pet,
      userTurns,
      journalSummary,
      ownerSigningName: vetMessageOwnerSignature,
      sessionDateLabel,
      logIsoTimestamp,
      timezoneAbbrev: tz || null,
      severity: lastComplete?.severity ?? null,
      vetNotificationPayload: lastComplete?.vetNotificationPayload ?? null,
      vetMedicalContext: lastComplete?.vetMedicalContext ?? null,
      vetOwnerContact,
      journalRecordId,
      vetAsk,
    };
    const body = buildVetMessageFromJournalSession(composeInput);
    const subject = buildVetMessageSubject(composeInput);
    router.push({
      pathname: "/(home)/messages",
      params: {
        composeMessage: encodeURIComponent(body),
        composeSubject: encodeURIComponent(subject),
        composePetId: pet.id,
        ...(recipientEmail ? { composeTo: recipientEmail } : {}),
      },
      } as any);
    },
    [pet, messages, vetMessageOwnerSignature, user, router]
  );

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

  /** One left margin for the whole column (aligns with Milo bubble inset); pills stack with even spacing. */
  const journalCtaTrackStyle = {
    marginLeft: 56,
    marginBottom: 8,
    gap: 10,
    alignSelf: "stretch" as const,
    maxWidth: "92%" as const,
  };

  const renderJournalCtaPill = (
    label: string,
    opts: {
      onPress: () => void;
      disabled?: boolean;
      accessibilityLabel: string;
      backgroundColor: string;
      color: string;
    }
  ) => (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={opts.disabled}
      onPress={opts.onPress}
      accessibilityRole="button"
      accessibilityLabel={opts.accessibilityLabel}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 9999,
        alignSelf: "flex-start",
        backgroundColor: opts.backgroundColor,
        opacity: opts.disabled ? 0.55 : 1,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "700", color: opts.color }}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={opts.color} />
    </TouchableOpacity>
  );

  const journalSavedPill = (m: Row) =>
    renderJournalCtaPill("Saved to Journal", {
      onPress: () => {
        if (m.journalNavTarget) openJournalEntry(m.journalNavTarget);
      },
      disabled: !m.journalNavTarget,
      accessibilityLabel: m.journalNavTarget ? "Saved to journal, open entry" : "Saving entry to journal",
      backgroundColor: "rgba(34,197,94,0.2)",
      color: "#15803d",
    });

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

  const renderFeedbackReasonChips = (m: Row) => {
    if (feedbackReasonForMessageId !== m.id || !m.feedbackReasonPending) return null;
    const tid = m.turnId ?? m.responseId;
    if (!tid) return null;
    return (
      <View style={{ marginLeft: 56, marginBottom: 8, gap: 6, maxWidth: "92%" }}>
        <Text style={{ fontSize: 12, color: theme.secondary }}>What went wrong?</Text>
        {JOURNAL_FEEDBACK_DOWN_REASONS.map((reason) => (
          <TouchableOpacity
            key={reason}
            onPress={() =>
              void onJournalFeedback(m.id, tid, "down", {
                feedbackReason: reason,
                treeVersion: m.treeVersion ?? lastTreeVersionRef.current,
                questionsAsked: m.questionsAskedCount ?? lastQuestionsAskedRef.current,
              })
            }
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ fontSize: 13, color: theme.foreground }}>{reason}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderActions = (m: Row, index: number) => {
    if (m.role !== "assistant" || !m.severity) return null;
    if (index !== messages.length - 1) return null;

    const midFlowChips = (m.suggestedReplies?.length ?? 0) > 0 && !m.journalSessionComplete;
    if (midFlowChips && m.severity !== "urgent") return null;

    if (midFlowChips && m.severity === "urgent") {
      return (
        <View style={{ marginLeft: 56, marginBottom: 8, maxWidth: "92%" as const }}>
          <EmergencyBanner showAdrNote={!!m.contextSurface?.adrWarning} />
        </View>
      );
    }

    if (m.journalSessionComplete) {
      if (treeUxActive) {
        const emergency =
          m.emergencyDetected === true ||
          m.journalEmergencyStop === true ||
          m.severity === "urgent";
        return (
          <PostSaveHandoff
            petName={pet?.name ?? "your pet"}
            emergency={emergency}
            showAdrNote={
              messages.some(
                (row) => row.contextSurface?.adrWarning && row.role === "assistant"
              )
            }
            onViewJournal={() => {
              if (m.journalNavTarget) openJournalEntry(m.journalNavTarget);
            }}
            onShareVet={() => openVetMessageCompose()}
            onFindErVet={
              emergency
                ? () => {
                    void Linking.openURL("https://www.google.com/maps/search/emergency+veterinarian+near+me").catch(
                      () => {}
                    );
                  }
                : undefined
            }
          />
        );
      }
      switch (m.severity) {
        case "low":
          return <View style={journalCtaTrackStyle}>{journalSavedPill(m)}</View>;
        case "medium":
          return (
            <View style={journalCtaTrackStyle}>
              {journalSavedPill(m)}
              {renderJournalCtaPill("Flag for next vet visit", {
                onPress: () =>
                  Alert.alert(
                    "Flag for vet",
                    "We’ll remind you to mention this at the next visit. Continue monitoring symptoms.",
                    [{ text: "OK" }]
                  ),
                accessibilityLabel: "Flag for next vet visit",
                backgroundColor: "rgba(245,158,11,0.2)",
                color: "#b45309",
              })}
            </View>
          );
        case "high":
          return (
            <View style={journalCtaTrackStyle}>
              {journalSavedPill(m)}
              {renderJournalCtaPill("Send symptoms to vet", {
                onPress: () => openVetMessageCompose(),
                disabled: shouldSuppressVetEmailCompose(m.vetNotificationPayload, m.severity),
                accessibilityLabel: "Send symptoms to vet",
                backgroundColor: "rgba(239,68,68,0.15)",
                color: "#b91c1c",
              })}
            </View>
          );
        case "urgent":
          return (
            <View style={{ ...journalCtaTrackStyle, marginBottom: 12 }}>
              {journalSavedPill(m)}
              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: "rgba(239,68,68,0.2)",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#991b1b" }}>
                  Possible emergency — seek immediate veterinary or ER care if your pet is in distress.
                </Text>
              </View>
              {renderJournalCtaPill("Emergency help (911)", {
                onPress: () => {
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
                },
                accessibilityLabel: "Emergency help call 911",
                backgroundColor: "#dc2626",
                color: "#fff",
              })}
            </View>
          );
        default:
          return <View style={journalCtaTrackStyle}>{journalSavedPill(m)}</View>;
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
          <View style={journalCtaTrackStyle}>
            {renderJournalCtaPill("Flag for next vet visit", {
              onPress: () =>
                Alert.alert(
                  "Flag for vet",
                  "We’ll remind you to mention this at the next visit. Continue monitoring symptoms.",
                  [{ text: "OK" }]
                ),
              accessibilityLabel: "Flag for next vet visit",
              backgroundColor: "rgba(245,158,11,0.2)",
              color: "#b45309",
            })}
          </View>
        );
      case "high":
        return (
          <View style={journalCtaTrackStyle}>
            {renderJournalCtaPill("Send symptoms to vet", {
              onPress: () => openVetMessageCompose(),
              disabled: shouldSuppressVetEmailCompose(m.vetNotificationPayload, m.severity),
              accessibilityLabel: "Send symptoms to vet",
              backgroundColor: "rgba(239,68,68,0.15)",
              color: "#b91c1c",
            })}
          </View>
        );
      case "urgent":
        return (
          <View style={{ ...journalCtaTrackStyle, marginBottom: 12 }}>
            <View
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: "rgba(239,68,68,0.2)",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#991b1b" }}>
                Possible emergency — seek immediate veterinary or ER care if your pet is in distress.
              </Text>
            </View>
            {renderJournalCtaPill("Emergency help (911)", {
              onPress: () => {
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
              },
              accessibilityLabel: "Emergency help call 911",
              backgroundColor: "#dc2626",
              color: "#fff",
            })}
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
            {aiJournalEntriesRemaining != null
              ? ` · ${aiJournalEntriesRemaining} AI check-in${aiJournalEntriesRemaining === 1 ? "" : "s"} left`
              : ""}
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

      {resumeDraft && messages.length === 0 ? (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 8,
            padding: 12,
            borderRadius: 10,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
          }}
        >
          <Text style={{ fontSize: 13, color: theme.foreground, marginBottom: 8 }}>
            You have a draft journal check-in in progress.
          </Text>
          <TouchableOpacity
            onPress={() => {
              journalSessionIdRef.current = resumeDraft.sessionId;
              setTreeUxActive(true);
              setResumeDraft(null);
              void handleSend("Resume draft");
            }}
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: theme.primary,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Resume draft</Text>
          </TouchableOpacity>
        </View>
      ) : null}

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
            {isRoutineJournalLogText(messages.filter((m) => m.role === "user").map((m) => m.content).join("\n"))
              ? "Full Milo journal interview couldn’t load — using a quick log on this device. Your entry can still save."
              : `Journal interview couldn’t load (${journalFallbackReason ?? "server error"}). Using guided questions on this device — try again later for full Milo.`}
            {__DEV__
              ? " Dev: ensure PawBuck.API is running and EXPO_PUBLIC_PAWBUCK_API_URL points at it."
              : ""}
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
              <ChatMessage
                message={
                  item.role === "assistant" &&
                  item.interviewPhase === "context_surface" &&
                  item.contextSurface
                    ? { ...item, content: "" }
                    : item
                }
                isNew={index === messages.length - 1}
                showInlineTurnFeedback={false}
                journalMode
              />
              {item.role === "assistant" &&
              item.interviewPhase === "context_surface" &&
              item.contextSurface &&
              pet ? (
                <ContextSurfaceBubble
                  petName={pet.name}
                  intro={
                    item.content.trim() ||
                    `Before we start, quick context I have on ${pet.name}:`
                  }
                  surface={item.contextSurface}
                  onAction={(actionId, label) => {
                    void handleSend(
                      actionId === "context_continue" ? "Looks right — continue" : label,
                      undefined,
                      actionId
                    );
                  }}
                />
              ) : null}
              {item.role === "assistant" &&
              item.interviewPhase === "question" &&
              item.currentQuestion &&
              pet ? (
                <TreeQuestionBubble
                  question={item.currentQuestion}
                  disabled={busy}
                  onAnswer={(msg, ids) => void handleSend(msg, ids)}
                  onSwitchToSymptom={() => {
                    pendingJournalTreeIdRef.current = "vomiting_v1.5";
                    journalSessionIdRef.current = null;
                    void handleSend("I'd like to log a symptom instead");
                  }}
                />
              ) : null}
              {item.role === "assistant" &&
              item.interviewPhase === "summary_draft" &&
              item.structuredSummary &&
              pet ? (
                <StructuredSummaryCard
                  petName={pet.name}
                  summary={item.structuredSummary}
                  attachmentCount={attachmentCount}
                  onAttachPhoto={() => void attachSummaryPhoto()}
                  onConfirm={() => void handleSend("Looks right — save", undefined, "confirm_summary")}
                  onEdit={() => openSummaryEditModal(item.structuredSummary!.fields)}
                />
              ) : null}
              {renderJournalFeedback(item, index)}
              {renderFeedbackReasonChips(item)}
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
                  width: "100%",
                  alignSelf: "stretch",
                  paddingHorizontal: 16,
                  paddingTop: 16,
                  paddingBottom: 24,
                  flexGrow: 1,
                  flexShrink: 0,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    minHeight: 160,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      width: 141,
                      height: 141,
                      borderRadius: 70.5,
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      source={MILO_AVATAR}
                      style={{ width: 141, height: 141 }}
                      contentFit="cover"
                    />
                  </View>
                </View>
                <Text style={{ fontSize: 20, fontWeight: "700", color: theme.foreground }}>
                  Hi{miloGreetingSuffix}!
                </Text>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "800",
                    color: theme.foreground,
                    marginTop: 6,
                    marginBottom: 14,
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
                    screenHorizontalPaddingPx={16}
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
        <View
          style={{
            width: "100%",
            alignSelf: "stretch",
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: 8,
            flexShrink: 0,
          }}
        >
          <ScrollView
            style={{ alignSelf: "stretch" }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            contentContainerStyle={{
              alignItems: "flex-start",
              paddingRight: 4,
              paddingBottom: 4,
            }}
          >
            {lastMessage.suggestedReplies.map((label, chipIndex) => (
              <MiloStarterSuggestionPill
                key={`${chipIndex}-${label}`}
                label={label}
                mode={isDark ? "dark" : "light"}
                fill={tokens.composerBg}
                stroke={tokens.composerBorder}
                textColor={tokens.textPrimary}
                screenHorizontalPaddingPx={16}
                onPress={() => {
                  if (
                    lastMessage.interviewPhase === "summary_draft" &&
                    lastMessage.structuredSummary &&
                    isEditSummaryIntent(label)
                  ) {
                    openSummaryEditModal(lastMessage.structuredSummary.fields);
                    setInput("");
                    return;
                  }
                  const ctx = lastMessage?.contextSurface;
                  let actionId = resolveContextSurfaceJournalAction(label, ctx);
                  const lower = label.trim().toLowerCase();
                  if (
                    !actionId &&
                    lastMessage.interviewPhase === "summary_draft" &&
                    lower.includes("looks right") &&
                    lower.includes("save")
                  ) {
                    actionId = "confirm_summary";
                  }
                  void handleSend(label, undefined, actionId);
                  setInput("");
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

        {/* Composer — match MiloChatModal: lifted card, inset field + circular send (no separate “input pill”). */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          <View
            style={{
              backgroundColor: tokens.composerBg,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: tokens.composerBorder,
              paddingHorizontal: 14,
              paddingVertical: 14,
              ...(!isDark && {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 16,
                elevation: 4,
              }),
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={`Tell Milo about ${pet.name}...`}
                placeholderTextColor={tokens.placeholder}
                style={{
                  flex: 1,
                  minHeight: 44,
                  maxHeight: 120,
                  fontSize: 15,
                  lineHeight: 22,
                  color: theme.foreground,
                  paddingVertical: 10,
                  paddingHorizontal: 10,
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
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  marginLeft: 4,
                  backgroundColor:
                    input.trim() && !busy && triageDisclaimerStatus === "accepted"
                      ? "#FFFFFF"
                      : isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(13,15,15,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 1,
                }}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={
                    input.trim() && !busy && triageDisclaimerStatus === "accepted"
                      ? "#0D0F0F"
                      : isDark
                        ? "rgba(255,255,255,0.35)"
                        : theme.secondary
                  }
                />
              </Pressable>
            </View>
          </View>
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

      <Modal visible={journalOnboardingVisible} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              borderRadius: 16,
              backgroundColor: theme.card,
              padding: 20,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", color: theme.foreground, marginBottom: 8 }}>
              Milo journal helper
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 21, color: theme.foreground }}>
              Milo asks a few focused questions and saves a structured note to your pet&apos;s journal. It does not
              diagnose or prescribe — contact your veterinarian for medical decisions. Never stop a medication without
              your vet&apos;s guidance.
            </Text>
            <TouchableOpacity
              onPress={() => {
                void setMiloJournalOnboardingSeen();
                setJournalOnboardingVisible(false);
              }}
              style={{
                marginTop: 16,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: theme.primary,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "700", color: "#fff" }}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {pet ? (
        <>
          <SummaryEditModal
            visible={summaryEditVisible}
            fields={summaryEditFields}
            onClose={() => setSummaryEditVisible(false)}
            onSave={(fields) => void applySummaryEdits(fields)}
          />
          <VetEmailComposer
            visible={vetComposerVisible}
            petId={pet.id}
            petName={pet.name}
            onClose={() => setVetComposerVisible(false)}
            onConfirm={(ask, email) => completeVetMessageCompose(ask, email)}
          />
        </>
      ) : null}
    </View>
  );
}
