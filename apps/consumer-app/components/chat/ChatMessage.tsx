import { ChatMessage as ChatMessageType } from "@/context/chatContext";
import { useTheme } from "@/context/themeContext";
import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

const MILO_AVATAR = require("@/assets/images/milo_gif.gif");

interface ChatMessageProps {
  message: ChatMessageType;
  isNew?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isNew = true }) => {
  const { theme } = useTheme();
  const isUser = message.role === "user";
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (isNew) {
      // Run entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // No animation for existing messages
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      scaleAnim.setValue(1);
    }
  }, []);

  return (
    <Animated.View
      style={{
        flexDirection: "row",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
        paddingHorizontal: 16,
        opacity: fadeAnim,
        transform: [
          { translateX: slideAnim },
          { scale: scaleAnim },
        ],
      }}
    >
      {/* Milo avatar for assistant messages */}
      {!isUser && (
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
            style={{ width: 30, height: 30 }}
            contentFit="contain"
          />
        </View>
      )}

      {/* Message bubble */}
      <View
        style={{
          maxWidth: "75%",
          backgroundColor: isUser ? theme.primary : theme.card,
          borderRadius: 16,
          borderTopLeftRadius: isUser ? 16 : 4,
          borderTopRightRadius: isUser ? 4 : 16,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text
          style={{
            color: isUser ? "#FFFFFF" : theme.foreground,
            fontSize: 15,
            lineHeight: 20,
          }}
        >
          {message.content}
        </Text>
        <Text
          style={{
            color: isUser ? "rgba(255,255,255,0.7)" : theme.secondary,
            fontSize: 11,
            marginTop: 4,
            textAlign: isUser ? "right" : "left",
          }}
        >
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </Animated.View>
  );
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
