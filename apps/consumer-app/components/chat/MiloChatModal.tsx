import { HEALTH_LAYOUT, healthListCardChrome } from "@/constants/figmaHealthLayout";
import {
  MILO_GENERAL_CHAT_DISCLAIMER_BODY,
  MILO_GENERAL_CHAT_DISCLAIMER_TITLE,
} from "@/constants/miloDisclaimers";
import { useAuth } from "@/context/authContext";
import { useChat } from "@/context/chatContext";
import { Pet, usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import {
  MILO_AVATAR_FRAME_SIZE,
  MILO_BUSY_HERO_BOX_SIZE,
  useMiloDocumentAnalysisAnimations,
  useMiloDocumentAnalysisStatusCopy,
} from "@/hooks/useMiloDocumentAnalysisAnimations";
import { useMiloSpeechToText } from "@/hooks/useMiloSpeechToText";
import { useMiloUpload } from "@/hooks/useMiloUpload";
import {
  buildMiloStarterPrompts,
  MILO_EMPTY_THREAD_PROMPT_COUNT,
} from "@/services/miloSuggestedPrompts";
import { buildDocumentUploadThreadContent } from "@/services/miloDocumentUploadThread";
import { pickPdfFile } from "@/utils/filePicker";
import { invalidateClinicalQueries } from "@/utils/invalidateClinicalQueries";
import { pickImageFromLibrary } from "@/utils/imagePicker";
import { fetchJournalEntries } from "@/services/petJournal";
import {
  hasAcceptedMiloGeneralChatDisclaimer,
  setAcceptedMiloGeneralChatDisclaimer,
} from "@/services/miloGeneralChatDisclaimer";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DocumentPickerAsset } from "expo-document-picker";
import type { ImagePickerAsset } from "expo-image-picker";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatMessage } from "./ChatMessage";
import { MiloStarterSuggestionPill } from "./MiloStarterSuggestionPill";
import { miloHiGreetingSuffixFromUser } from "@/utils/userDisplayIdentity";
import { getMiloChatTokens } from "./miloUiTokens";

// Typing dots animation component
const TypingDots: React.FC<{ color: string }> = ({ color }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 150),
      animateDot(dot3, 300),
    ]);

    animation.start();

    return () => animation.stop();
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color,
    marginHorizontal: 2,
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
};

const MILO_AVATAR = require("@/assets/images/milo_gif.gif");

/** Generating state: black outer circle, white ring, black center dot (record/target icon) */
const GeneratingIcon: React.FC = () => (
  <View
    style={{
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#1A1A1A",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <View
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: "#1A1A1A",
        }}
      />
    </View>
  </View>
);

export const MiloChatModal: React.FC = () => {
  const { theme, mode } = useTheme();
  const { user } = useAuth();
  const { pets } = usePets();
  const {
    messages,
    isLoading,
    selectedPet,
    setSelectedPet,
    sendMessage,
    isChatOpen,
    starterScreen,
    closeChat,
    clearMessages,
    appendLocalMessages,
  } = useChat();

  const queryClient = useQueryClient();
  const { uploadAndAnalyze, status: uploadStatus, reset: resetUpload } = useMiloUpload();

  const [inputText, setInputText] = useState("");
  const { isListening, toggleSpeech, stopSpeech } = useMiloSpeechToText(
    inputText,
    setInputText
  );
  const [showPetPicker, setShowPetPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  /** One-time Milo general chat acknowledgment (separate from journal triage). */
  const [generalDisclaimerStatus, setGeneralDisclaimerStatus] = useState<"loading" | "pending" | "accepted">(
    "loading"
  );
  const flatListRef = useRef<FlatList>(null);
  const { top, bottom } = useSafeAreaInsets();

  useEffect(() => {
    if (!isChatOpen) {
      setGeneralDisclaimerStatus("loading");
      return;
    }
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        if (!cancelled) setGeneralDisclaimerStatus("accepted");
        return;
      }
      try {
        const ok = await hasAcceptedMiloGeneralChatDisclaimer(user.id);
        if (!cancelled) setGeneralDisclaimerStatus(ok ? "accepted" : "pending");
      } catch {
        if (!cancelled) setGeneralDisclaimerStatus("pending");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isChatOpen, user?.id]);
  useEffect(() => {
    const scrollEnd = () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardDidShow" : "keyboardDidShow",
      scrollEnd
    );
    return () => showSubscription.remove();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    if (!isChatOpen) {
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        /* noop */
      }
    }
  }, [isChatOpen]);

  useEffect(() => {
    if (!isChatOpen) {
      resetUpload();
    }
  }, [isChatOpen, resetUpload]);

  const runMiloDocumentUpload = useCallback(
    async (file: ImagePickerAsset | DocumentPickerAsset) => {
      if (generalDisclaimerStatus !== "accepted") return;
      if (!selectedPet) return;
      try {
        const row = await uploadAndAnalyze(selectedPet.id, selectedPet.name, file);
        const { userContent, assistantContent } = buildDocumentUploadThreadContent(
          {
            documentType: row.documentType,
            extractedJson: row.extractedJson,
            clinicalSync: row.clinicalSync ?? null,
          },
          { id: selectedPet.id, name: selectedPet.name },
          pets.map((p) => ({ id: p.id, name: p.name }))
        );
        const t = Date.now();
        appendLocalMessages([
          { id: `${t}-u`, role: "user", content: userContent, timestamp: new Date() },
          { id: `${t}-a`, role: "assistant", content: assistantContent, timestamp: new Date() },
        ]);
        await invalidateClinicalQueries(queryClient, selectedPet.id);
      } catch (e) {
        Alert.alert("Error", e instanceof Error ? e.message : "Upload failed");
      }
    },
    [appendLocalMessages, pets, queryClient, selectedPet, uploadAndAnalyze, generalDisclaimerStatus]
  );

  const handleComposerAddPress = useCallback(() => {
    if (generalDisclaimerStatus !== "accepted") return;
    const docBusy = uploadStatus === "uploading" || uploadStatus === "analyzing";
    if (isLoading || docBusy) return;
    stopSpeech();
    if (!selectedPet) {
      setShowPetPicker(true);
      return;
    }
    Alert.alert(
      "Add document",
      "Upload a photo or PDF. Milo will classify it from the file contents.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Photo library",
          onPress: () => {
            void (async () => {
              const img = await pickImageFromLibrary();
              if (!img) return;
              await runMiloDocumentUpload(img);
            })();
          },
        },
        {
          text: "PDF",
          onPress: () => {
            void (async () => {
              const pdf = await pickPdfFile();
              if (!pdf) return;
              await runMiloDocumentUpload(pdf);
            })();
          },
        },
      ]
    );
  }, [isLoading, uploadStatus, selectedPet, stopSpeech, runMiloDocumentUpload, generalDisclaimerStatus]);

  const docPipelineBusy = uploadStatus === "uploading" || uploadStatus === "analyzing";
  const composerBusy = isLoading || docPipelineBusy || generalDisclaimerStatus !== "accepted";
  const heroAnimationsActive = docPipelineBusy && messages.length === 0;
  const spinIconActive = composerBusy && (docPipelineBusy || isLoading);

  const cyclingDocStatus = useMiloDocumentAnalysisStatusCopy(docPipelineBusy);
  const { spinRotate, breathScale, sonarScale, sonarOpacity } = useMiloDocumentAnalysisAnimations({
    spin: spinIconActive,
    hero: heroAnimationsActive,
  });

  const composerBusyLabel = docPipelineBusy
    ? cyclingDocStatus
    : isLoading
      ? "Generating..."
      : generalDisclaimerStatus === "pending"
        ? "Please accept the disclaimer to continue."
        : generalDisclaimerStatus === "loading"
          ? "…"
          : "";

  const handleSend = async () => {
    if (!inputText.trim() || composerBusy) return;

    stopSpeech();
    const message = inputText.trim();
    setInputText("");
    await sendMessage(message);
  };

  const { data: suggestedPromptData } = useQuery({
    queryKey: ["miloSuggestedPrompts", selectedPet?.id, starterScreen],
    enabled: Boolean(isChatOpen && selectedPet?.id && starterScreen === "default"),
    queryFn: async () => {
      const petId = selectedPet!.id;
      const [vaccinations, journalEntries] = await Promise.all([
        getVaccinationsByPetId(petId),
        fetchJournalEntries(petId, "health"),
      ]);
      return { vaccinations, journalEntries };
    },
  });

  const rotationSeed = `${user?.id ?? ""}|${selectedPet?.id ?? ""}`;

  const miloGreetingSuffix = useMemo(() => miloHiGreetingSuffixFromUser(user ?? undefined), [user]);

  const suggestedQuestions = useMemo(() => {
    const baseInput = !selectedPet?.id
      ? {
          petName: null as string | null | undefined,
          vaccinations: [],
          journalEntries: [],
          maxCount: MILO_EMPTY_THREAD_PROMPT_COUNT,
          rotationSeed,
        }
      : {
          petName: selectedPet.name,
          vaccinations: suggestedPromptData?.vaccinations ?? [],
          journalEntries: suggestedPromptData?.journalEntries ?? [],
          maxCount: MILO_EMPTY_THREAD_PROMPT_COUNT,
          rotationSeed,
        };
    return buildMiloStarterPrompts(starterScreen, baseInput);
  }, [
    starterScreen,
    rotationSeed,
    selectedPet?.id,
    selectedPet?.name,
    suggestedPromptData?.vaccinations,
    suggestedPromptData?.journalEntries,
  ]);

  const handleSuggestedQuestion = useCallback(
    async (question: string) => {
      if (composerBusy) return;
      stopSpeech();
      setInputText("");
      await sendMessage(question);
    },
    [composerBusy, sendMessage, stopSpeech]
  );

  const handleSelectPet = (pet: Pet | null) => {
    setSelectedPet(pet);
    setShowPetPicker(false);
  };

  const tokens = getMiloChatTokens(theme, mode === "dark");
  const listCardChrome = healthListCardChrome(theme, mode === "dark");

  return (
    <Modal
      visible={isChatOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closeChat}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          paddingTop: Platform.OS === "android" ? top : 0,
          paddingBottom: Platform.OS === "android" ? bottom : 0,
        }}
      >
        {/* Header: back | New Chat | menu — Figma layout */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: Platform.OS === "ios" ? top + 8 : 16,
            paddingBottom: 14,
          }}
        >
          <TouchableOpacity
            onPress={closeChat}
            hitSlop={12}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: mode === "dark" ? theme.card : "rgba(0,0,0,0.06)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.foreground} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: theme.foreground,
            }}
          >
            New Chat
          </Text>
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            hitSlop={12}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: mode === "dark" ? theme.card : "rgba(0,0,0,0.06)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="menu" size={22} color={theme.foreground} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? top + 62 : 0}
        >
        {/* Messages Container */}
        <View style={{ flex: 1, minHeight: 0, flexShrink: 1 }}>
          {messages.length === 0 ? (
            <View
              style={{
                flex: 1,
                minHeight: 0,
                flexShrink: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: MILO_BUSY_HERO_BOX_SIZE,
                  height: MILO_BUSY_HERO_BOX_SIZE,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {heroAnimationsActive ? (
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      width: MILO_AVATAR_FRAME_SIZE,
                      height: MILO_AVATAR_FRAME_SIZE,
                      borderRadius: MILO_AVATAR_FRAME_SIZE / 2,
                      borderWidth: 2,
                      borderColor: theme.primary,
                      backgroundColor:
                        mode === "dark" ? "rgba(95, 196, 192, 0.14)" : "rgba(43, 168, 158, 0.14)",
                      opacity: sonarOpacity,
                      transform: [{ scale: sonarScale }],
                    }}
                  />
                ) : null}
                <Animated.View
                  style={{
                    transform: [{ scale: heroAnimationsActive ? breathScale : 1 }],
                  }}
                >
                  <View
                    style={{
                      width: MILO_AVATAR_FRAME_SIZE,
                      height: MILO_AVATAR_FRAME_SIZE,
                      borderRadius: MILO_AVATAR_FRAME_SIZE / 2,
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      source={MILO_AVATAR}
                      style={{
                        width: MILO_AVATAR_FRAME_SIZE,
                        height: MILO_AVATAR_FRAME_SIZE,
                      }}
                      contentFit="cover"
                    />
                  </View>
                </Animated.View>
              </View>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              style={{ flex: 1 }}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ChatMessage message={item} />}
              contentContainerStyle={{
                paddingVertical: 16,
                paddingBottom: 20,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            />
          )}

          {/* Loading indicator with typing dots */}
          {isLoading && (
            <View
              style={{
                paddingHorizontal: HEALTH_LAYOUT.screenPaddingX,
                paddingBottom: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: theme.card,
                    marginRight: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <Image
                    source={MILO_AVATAR}
                    style={{ width: 30, height: 30, borderRadius: 15 }}
                    contentFit="cover"
                  />
                </View>
                <View
                  style={{
                    backgroundColor: listCardChrome.cardBg,
                    borderRadius: HEALTH_LAYOUT.cardRadius,
                    borderWidth: listCardChrome.borderWidth,
                    borderColor: listCardChrome.borderColor,
                    paddingHorizontal: HEALTH_LAYOUT.cardPadding,
                    paddingVertical: 12,
                  }}
                >
                  <TypingDots color={theme.primary} />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Starter prompts — empty thread; capsule pills (readable, tappable) */}
        {messages.length === 0 && !composerBusy ? (
          <View
            style={{
              width: "100%",
              alignSelf: "stretch",
              paddingHorizontal: 16,
              paddingBottom: 8,
              flexShrink: 0,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: theme.foreground,
              }}
            >
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
              {suggestedQuestions.map((q) => (
                <MiloStarterSuggestionPill
                  key={q}
                  label={q}
                  mode={mode}
                  fill={tokens.composerBg}
                  stroke={tokens.composerBorder}
                  textColor={tokens.textPrimary}
                  screenHorizontalPaddingPx={16}
                  onPress={() => {
                    void handleSuggestedQuestion(q);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Input — Figma 1386:45325: white composer card, #E4E7E7 stroke, #F4F5F5 wells, sparkles + send */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: messages.length === 0 && !composerBusy ? 0 : 8,
            paddingBottom: Math.max(bottom, 12),
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
              ...(mode === "light" && {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 16,
                elevation: 4,
              }),
            }}
          >
            {composerBusy ? (
              <View style={{ flexDirection: "row", alignItems: "center", minHeight: 48 }}>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: tokens.placeholder,
                  }}
                >
                  {composerBusyLabel}
                </Text>
                <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
                  <GeneratingIcon />
                </Animated.View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  onPress={handleComposerAddPress}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: tokens.iconWell,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Ionicons name="add" size={22} color={tokens.textPrimary} />
                </TouchableOpacity>
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask milo anything..."
                  placeholderTextColor={tokens.placeholder}
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: theme.foreground,
                    paddingVertical: 10,
                    paddingHorizontal: 2,
                    minHeight: 44,
                  }}
                  multiline
                  maxLength={500}
                  editable={generalDisclaimerStatus === "accepted"}
                  showSoftInputOnFocus
                  keyboardAppearance={mode === "dark" ? "dark" : "light"}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  accessibilityLabel={
                    isListening ? "Stop voice input" : "Voice input"
                  }
                  onPress={() => {
                    if (!composerBusy) toggleSpeech();
                  }}
                  disabled={composerBusy}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: isListening
                      ? mode === "dark"
                        ? "rgba(255,255,255,0.16)"
                        : "rgba(43,168,158,0.2)"
                      : tokens.iconWell,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                  }}
                >
                  <Ionicons
                    name={isListening ? "mic" : "mic-outline"}
                    size={22}
                    color={
                      isListening ? theme.primary : tokens.textPrimary
                    }
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={composerBusy || !inputText.trim()}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: inputText.trim()
                      ? "#FFFFFF"
                      : mode === "dark"
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(13,15,15,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="send"
                    size={18}
                    color={
                      inputText.trim()
                        ? "#0D0F0F"
                        : mode === "dark"
                          ? "rgba(255,255,255,0.35)"
                          : theme.secondary
                    }
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        </KeyboardAvoidingView>

        {generalDisclaimerStatus === "pending" ? (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                zIndex: 100,
                backgroundColor: "rgba(0,0,0,0.45)",
                justifyContent: "center",
                paddingHorizontal: 20,
                paddingTop: Math.max(top, 24),
                paddingBottom: Math.max(bottom, 24),
              },
            ]}
          >
            <View
              style={{
                maxHeight: "88%",
                borderRadius: 16,
                backgroundColor: theme.card,
                padding: 20,
                borderWidth: 1,
                borderColor: mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "800", color: theme.foreground, marginBottom: 12 }}>
                {MILO_GENERAL_CHAT_DISCLAIMER_TITLE}
              </Text>
              <ScrollView
                style={{ maxHeight: 360 }}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
              >
                <Text style={{ fontSize: 14, lineHeight: 21, color: theme.foreground }}>
                  {MILO_GENERAL_CHAT_DISCLAIMER_BODY}
                </Text>
              </ScrollView>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Accept Milo general chat disclaimer"
                onPress={() => {
                  if (!user?.id) return;
                  void (async () => {
                    await setAcceptedMiloGeneralChatDisclaimer(user.id);
                    setGeneralDisclaimerStatus("accepted");
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
              <TouchableOpacity onPress={() => closeChat()} style={{ marginTop: 12, paddingVertical: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: theme.secondary, textAlign: "center" }}>
                  Go back
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Menu Modal — New chat, Select pet */}
        <Modal
          visible={showMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-start", paddingTop: 60, paddingHorizontal: 24 }}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  paddingVertical: 8,
                  overflow: "hidden",
                }}
              >
              <TouchableOpacity
                onPress={() => {
                  clearMessages();
                  setShowMenu(false);
                }}
                style={{ flexDirection: "row", alignItems: "center", padding: 16 }}
              >
                <Ionicons name="refresh" size={22} color={theme.foreground} style={{ marginRight: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: "500", color: theme.foreground }}>New chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowMenu(false);
                  setShowPetPicker(true);
                }}
                style={{ flexDirection: "row", alignItems: "center", padding: 16 }}
              >
                <Ionicons name="paw" size={22} color={theme.foreground} style={{ marginRight: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: "500", color: theme.foreground }}>Select pet</Text>
              </TouchableOpacity>
              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.secondary + "30" }}>
                <Text style={{ fontSize: 12, color: theme.secondary, lineHeight: 18 }}>
                  <Text style={{ fontWeight: "600" }}>Medical:</Text> All medical queries should be directed to a licensed veterinarian.
                </Text>
              </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Pet Picker Modal */}
        <Modal
          visible={showPetPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPetPicker(false)}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
            activeOpacity={1}
            onPress={() => setShowPetPicker(false)}
          >
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 8,
                width: "80%",
                maxHeight: "60%",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.foreground,
                  padding: 12,
                  textAlign: "center",
                }}
              >
                Select a Pet
              </Text>

              <TouchableOpacity
                onPress={() => handleSelectPet(null)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: !selectedPet
                    ? theme.primary + "20"
                    : "transparent",
                }}
              >
                <Ionicons
                  name="globe-outline"
                  size={24}
                  color={theme.secondary}
                  style={{ marginRight: 12 }}
                />
                <Text style={{ color: theme.foreground, flex: 1 }}>
                  General (no specific pet)
                </Text>
                {!selectedPet && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>

              {pets.map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  onPress={() => handleSelectPet(pet)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor:
                      selectedPet?.id === pet.id
                        ? theme.primary + "20"
                        : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.background,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons
                      name={pet.animal_type === "Dog" ? "paw" : "paw-outline"}
                      size={20}
                      color={theme.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: theme.foreground, fontWeight: "500" }}
                    >
                      {pet.name}
                    </Text>
                    <Text style={{ color: theme.secondary, fontSize: 12 }}>
                      {pet.breed}
                    </Text>
                  </View>
                  {selectedPet?.id === pet.id && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={theme.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Modal>
  );
};
