import { HEALTH_LAYOUT, healthListCardChrome } from "@/constants/figmaHealthLayout";
import { useAuth } from "@/context/authContext";
import { useChat } from "@/context/chatContext";
import { Pet, usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { useMiloSpeechToText } from "@/hooks/useMiloSpeechToText";
import { buildMiloSuggestedPrompts } from "@/services/miloSuggestedPrompts";
import { fetchJournalEntries } from "@/services/petJournal";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import { useQuery } from "@tanstack/react-query";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Keyboard,
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
const MILO_CHAT_BG_LIGHT = require("@/assets/icons/Milo-Light.png");
const MILO_CHAT_BG_DARK = require("@/assets/icons/Milo-Dark.png");

/** Full-screen chat backdrop: `Milo-Light.png` / `Milo-Dark.png` in `assets/icons`. */
const MiloChatBackdrop: React.FC<{ mode: "light" | "dark" }> = ({ mode }) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <Image
      source={mode === "light" ? MILO_CHAT_BG_LIGHT : MILO_CHAT_BG_DARK}
      style={StyleSheet.absoluteFill}
      contentFit="fill"
    />
  </View>
);

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
    closeChat,
    clearMessages,
  } = useChat();

  const [inputText, setInputText] = useState("");
  const { isListening, toggleSpeech, stopSpeech } = useMiloSpeechToText(
    inputText,
    setInputText
  );
  const [showPetPicker, setShowPetPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { top, bottom } = useSafeAreaInsets();
  /** iOS + Android: keep composer above keyboard (modal had iOS-only before; Android hid the field). */
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
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

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    stopSpeech();
    const message = inputText.trim();
    setInputText("");
    await sendMessage(message);
  };

  const { data: suggestedPromptData } = useQuery({
    queryKey: ["miloSuggestedPrompts", selectedPet?.id],
    enabled: Boolean(isChatOpen && selectedPet?.id),
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

  const miloGreetingSuffix = useMemo(() => {
    const meta = user?.user_metadata as { full_name?: string } | undefined;
    const full = typeof meta?.full_name === "string" ? meta.full_name.trim() : "";
    const first = full ? full.split(/\s+/)[0] : user?.email?.split("@")[0];
    return first ? ` ${first}` : "";
  }, [user]);

  const suggestedQuestions = useMemo(() => {
    if (!selectedPet?.id) {
      return buildMiloSuggestedPrompts({
        petName: null,
        vaccinations: [],
        journalEntries: [],
        maxCount: 6,
        rotationSeed,
      });
    }
    return buildMiloSuggestedPrompts({
      petName: selectedPet.name,
      vaccinations: suggestedPromptData?.vaccinations ?? [],
      journalEntries: suggestedPromptData?.journalEntries ?? [],
      maxCount: 6,
      rotationSeed,
    });
  }, [
    rotationSeed,
    selectedPet?.id,
    selectedPet?.name,
    suggestedPromptData?.vaccinations,
    suggestedPromptData?.journalEntries,
  ]);

  const handleSuggestedQuestion = useCallback(
    async (question: string) => {
      if (isLoading) return;
      stopSpeech();
      setInputText("");
      await sendMessage(question);
    },
    [isLoading, sendMessage, stopSpeech]
  );

  const handleSelectPet = (pet: Pet | null) => {
    setSelectedPet(pet);
    setShowPetPicker(false);
  };

  const tokens = getMiloChatTokens(theme, mode === "dark");
  const miloBg = tokens.screenBg;
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
          backgroundColor: miloBg,
          paddingTop: Platform.OS === "android" ? top : 0,
          paddingBottom: Platform.OS === "android" ? bottom : 0,
        }}
      >
        <MiloChatBackdrop mode={mode} />
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

        {/* Messages Container */}
        <View style={{ flex: 1 }}>
          {messages.length === 0 ? (
            <View style={{ flex: 1 }} />
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

        {/* Starter prompts — empty thread; vertical pills (readable, tappable) */}
        {messages.length === 0 && !isLoading ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8, maxHeight: 240 }}>
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
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {suggestedQuestions.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => {
                    void handleSuggestedQuestion(q);
                  }}
                  style={({ pressed }) => ({
                    width: "100%",
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 16,
                    marginBottom: 10,
                    backgroundColor: tokens.chipBg,
                    borderWidth: 1,
                    borderColor: tokens.chipBorder,
                    opacity: pressed ? 0.88 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 22,
                      color: tokens.textPrimary,
                    }}
                  >
                    {q}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Input — Figma 1386:45325: white composer card, #E4E7E7 stroke, #F4F5F5 wells, sparkles + send */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: messages.length === 0 && !isLoading ? 0 : 8,
            paddingBottom: Math.max(bottom, 12),
            transform: keyboardHeight > 0 ? [{ translateY: -keyboardHeight }] : [],
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
            {isLoading ? (
              <View style={{ flexDirection: "row", alignItems: "center", minHeight: 48 }}>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: tokens.placeholder,
                  }}
                >
                  Generating...
                </Text>
                <GeneratingIcon />
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  onPress={() => setShowPetPicker(true)}
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
                  editable={true}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  accessibilityLabel={
                    isListening ? "Stop voice input" : "Voice input"
                  }
                  onPress={() => {
                    if (!isLoading) toggleSpeech();
                  }}
                  disabled={isLoading}
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
                  disabled={!inputText.trim()}
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
