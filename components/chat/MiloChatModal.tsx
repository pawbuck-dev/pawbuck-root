import { useChat } from "@/context/chatContext";
import { Pet, usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatMessage } from "./ChatMessage";

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
  const flatListRef = useRef<FlatList>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { bottom } = useSafeAreaInsets();
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

  const renderEmptyState = () => (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: theme.card,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        <Image
          source={MILO_AVATAR}
          style={{ width: 100, height: 100, borderRadius: 50 }}
          contentFit="cover"
        />
      </View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "600",
          color: theme.foreground,
          marginBottom: 8,
        }}
      >
        Hi! I'm Milo 🐕
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: theme.secondary,
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        {selectedPet
          ? `I'm ready to help with ${selectedPet.name}! Ask me anything about pet care.`
          : "Select a pet to get started"}
      </Text>

      {!selectedPet && pets.length > 0 && (
        <TouchableOpacity
          onPress={() => setShowPetPicker(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.secondary + "40",
            backgroundColor: theme.card,
          }}
        >
          <Text style={{ color: theme.foreground, marginRight: 8 }}>
            Select pet
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Modal
      visible={isChatOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeChat}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          paddingBottom: Platform.OS === "android" ? bottom : 0,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 12,
            backgroundColor: theme.card,
            borderBottomWidth: 1,
            borderBottomColor: theme.background,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.background,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                overflow: "hidden",
              }}
            >
              <Image
                source={MILO_AVATAR}
                style={{ width: 36, height: 36, borderRadius: 18 }}
                contentFit="cover"
              />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.foreground,
                }}
              >
                Milo
              </Text>
              <Text style={{ fontSize: 12, color: theme.secondary }}>
                Your AI buddy
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              onPress={clearMessages}
              style={{
                width: 36,
                height: 36,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="refresh" size={20} color={theme.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={closeChat}
              style={{
                width: 36,
                height: 36,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={24} color={theme.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pet Selector Bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: theme.card,
            borderBottomWidth: 1,
            borderBottomColor: theme.background,
          }}
        >
          <TouchableOpacity
            onPress={() => setShowPetPicker(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.secondary + "40",
              backgroundColor: theme.background,
              flex: 1,
            }}
          >
            <Text style={{ color: theme.foreground, flex: 1 }}>
              {selectedPet ? selectedPet.name : "Select pet"}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.secondary} />
          </TouchableOpacity>
        </View>

        {/* Medical Disclaimer */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: "#4A3F1F",
            borderRadius: 8,
            marginHorizontal: 16,
            marginTop: 12,
          }}
        >
          <Text style={{ fontSize: 16, marginRight: 8 }}>⚠️</Text>
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              color: "#D4A84B",
              lineHeight: 18,
            }}
          >
            <Text style={{ fontWeight: "600" }}>Medical Disclaimer: </Text>
            All medical queries should be directed to a licensed veterinarian.
          </Text>
        </View>

        {/* Messages Container - Wrapped in flex container for proper keyboard handling */}
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

        {/* Input - Positioned above keyboard */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingBottom: Platform.OS === "ios" ? 34 : 12,
            backgroundColor: theme.card,
            borderTopWidth: 1,
            borderTopColor: theme.background,
            transform:
              Platform.OS === "ios" ? [{ translateY: -keyboardHeight }] : [],
          }}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask Milo anything..."
            placeholderTextColor={theme.secondary}
            style={{
              flex: 1,
              backgroundColor: theme.background,
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 15,
              color: theme.foreground,
              marginRight: 8,
            }}
            multiline
            maxLength={500}
            editable={!isLoading}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor:
                inputText.trim() && !isLoading
                  ? theme.primary
                  : theme.secondary + "40",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

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
