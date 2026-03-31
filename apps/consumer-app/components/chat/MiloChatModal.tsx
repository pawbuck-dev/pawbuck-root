import { useChat } from "@/context/chatContext";
import { Pet, usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatMessage } from "./ChatMessage";
import { getMiloChatTokens, getBackdropGradientProps } from "./miloUiTokens";

/** Figma Milo chat — suggested prompt chips (icon + label). */
const SUGGESTED_PROMPTS: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }[] = [
  { icon: "paw", label: "Is my dog's diet healthy?" },
  { icon: "flash", label: "Tips for new puppy owners" },
  { icon: "paw-outline", label: "My cat has a fever" },
  { icon: "medkit-outline", label: "When is the next vaccine?" },
];

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

/** Light-mode backdrop: soft teal blooms + cool mint wash (matches exported SVG). */
const MiloFigmaLightBackdrop: React.FC = () => {
  const gradientProps = getBackdropGradientProps("light");
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={gradientProps.colors}
        locations={gradientProps.locations}
        start={gradientProps.start}
        end={gradientProps.end}
      />
      <View
        style={{
          position: "absolute",
          top: -200,
          alignSelf: "center",
          width: 440,
          height: 440,
          borderRadius: 220,
          backgroundColor: "#5CECE2",
          opacity: 0.2,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: -240,
          alignSelf: "center",
          width: 400,
          height: 400,
          borderRadius: 200,
          backgroundColor: "#12BAB7",
          opacity: 0.14,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: -120,
          alignSelf: "center",
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: "#1ECBFF",
          opacity: 0.08,
        }}
      />
    </View>
  );
};

/** Dark-mode backdrop: subtle cyan/teal blooms over dark base. */
const MiloDarkBackdrop: React.FC = () => {
  const gradientProps = getBackdropGradientProps("dark");
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={gradientProps.colors}
        locations={gradientProps.locations}
        start={gradientProps.start}
        end={gradientProps.end}
      />
      <View
        style={{
          position: "absolute",
          top: -200,
          alignSelf: "center",
          width: 440,
          height: 440,
          borderRadius: 220,
          backgroundColor: "#5FC4C0",
          opacity: 0.1,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: -240,
          alignSelf: "center",
          width: 400,
          height: 400,
          borderRadius: 200,
          backgroundColor: "#2BA89E",
          opacity: 0.08,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: -120,
          alignSelf: "center",
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: "#3BD0D2",
          opacity: 0.06,
        }}
      />
    </View>
  );
};

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
  const [showPetPicker, setShowPetPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { top, bottom } = useSafeAreaInsets();
  // Handle keyboard show/hide on iOS for pageSheet modals
  useEffect(() => {
    if (Platform.OS === "ios") {
      const showSubscription = Keyboard.addListener("keyboardWillShow", (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });
      const hideSubscription = Keyboard.addListener("keyboardWillHide", () => {
        setKeyboardHeight(0);
      });

      return () => {
        showSubscription.remove();
        hideSubscription.remove();
      };
    }
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const message = inputText.trim();
    setInputText("");
    await sendMessage(message);
  };

  const handleSelectPet = (pet: Pet | null) => {
    setSelectedPet(pet);
    setShowPetPicker(false);
  };

  const handleSuggestedPrompt = (label: string) => {
    setInputText(label);
    // Optionally auto-send; for now prefill so user can edit
    sendMessage(label);
  };

  const renderEmptyState = () => {
    const tokens = getMiloChatTokens(theme, mode === "dark");
    const cardBg = mode === "dark" ? theme.card : tokens.messageAiBg;
    const chipBg = tokens.chipBg;
    const chipBorder = tokens.chipBorder;
    const bodyText = tokens.textPrimary;

    return (
      <View
        style={{
          flex: 1,
          paddingHorizontal: 16,
          paddingVertical: 12,
          justifyContent: "center",
        }}
      >
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 36,
            paddingBottom: 28,
            alignItems: "center",
            alignSelf: "stretch",
            ...(mode === "light" && {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
            }),
          }}
        >
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: theme.primary,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              overflow: "hidden",
            }}
          >
            <Image
              source={MILO_AVATAR}
              style={{ width: 90, height: 90, borderRadius: 45 }}
              contentFit="cover"
            />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: bodyText,
              textAlign: "center",
              marginBottom: 20,
              paddingHorizontal: 4,
              lineHeight: 26,
            }}
          >
            Hi! I'm Milo, how can I help you today?
          </Text>
          {/* Two fixed rows of flex:1 chips — avoids RN bug where % width + Text flex:1 in Pressable collapses label width */}
          <View style={{ width: "100%", marginBottom: 20 }}>
            {[0, 2].map((start) => (
              <View
                key={start}
                style={{
                  flexDirection: "row",
                  width: "100%",
                  marginBottom: start === 0 ? 12 : 0,
                  gap: 12,
                }}
              >
                {SUGGESTED_PROMPTS.slice(start, start + 2).map(({ icon, label }) => (
                  <Pressable
                    key={label}
                    onPress={() => handleSuggestedPrompt(label)}
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: 0,
                      minHeight: 52,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderRadius: 14,
                      backgroundColor: chipBg,
                      borderWidth: 1,
                      borderColor: chipBorder,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <View style={{ flexDirection: "row", alignItems: "flex-start", width: "100%" }}>
                      <Ionicons name={icon} size={18} color={theme.primary} style={{ marginRight: 8, marginTop: 1 }} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "500",
                            color: bodyText,
                            lineHeight: 18,
                          }}
                          numberOfLines={3}
                        >
                          {label}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => pets.length > 0 && setShowPetPicker(true)}
            style={{ paddingVertical: 4 }}
          >
            <Text
              style={{
                fontSize: 14,
                color: theme.secondary,
              }}
            >
              {selectedPet ? `Chatting as ${selectedPet.name}` : "Select pet for personalized help"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  /** Figma node 1386:45325 — Milo.svg base + teal glow backdrop. */
  const tokens = getMiloChatTokens(theme, mode === "dark");
  const miloBg = tokens.screenBg;

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
          overflow: "hidden",
        }}
      >
        {mode === "light" ? <MiloFigmaLightBackdrop /> : <MiloDarkBackdrop />}
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
            renderEmptyState()
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ChatMessage message={item} />}
              contentContainerStyle={{
                paddingVertical: 16,
                paddingBottom: 20,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* Loading indicator with typing dots */}
          {isLoading && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
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
                    backgroundColor: theme.card,
                    borderRadius: 16,
                    borderTopLeftRadius: 4,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                  }}
                >
                  <TypingDots color={theme.primary} />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Input — Figma 1386:45325: white composer card, #E4E7E7 stroke, #F4F5F5 wells, sparkles + send */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: Platform.OS === "ios" ? Math.max(bottom, 12) : 12,
            transform: Platform.OS === "ios" ? [{ translateY: -keyboardHeight }] : [],
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
                  placeholder="Ask Milo anything..."
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
                  accessibilityLabel="Suggestions"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: tokens.iconWell,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                  }}
                >
                  <Ionicons name="sparkles-outline" size={22} color="#0D0F0F" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!inputText.trim()}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: inputText.trim() ? "#0D0F0F" : "rgba(13,15,15,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="send" size={18} color="#FFFFFF" />
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
