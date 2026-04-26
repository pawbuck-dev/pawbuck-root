import { ChatMessage as ChatMessageType } from "@/context/chatContext";
import { HEALTH_ELEVATION, HEALTH_LAYOUT, healthListCardChrome } from "@/constants/figmaHealthLayout";
import { useTheme } from "@/context/themeContext";
import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { MiloFileAttachmentChips } from "./MiloFileAttachmentChips";
import { MiloMessageBody } from "./MiloMessageBody";

const MILO_AVATAR = require("@/assets/images/milo_gif.gif");

interface ChatMessageProps {
  message: ChatMessageType;
  isNew?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isNew = true }) => {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const isUser = message.role === "user";
  const chrome = healthListCardChrome(theme, isDark);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (isNew) {
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
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      scaleAnim.setValue(1);
    }
  }, []);

  const bubbleStyle = isUser
    ? {
        maxWidth: "78%" as const,
        backgroundColor: theme.primary,
        borderRadius: HEALTH_LAYOUT.cardRadius,
        padding: HEALTH_LAYOUT.cardPadding,
        borderWidth: 1,
        borderColor: theme.primary,
      }
    : {
        maxWidth: "85%" as const,
        backgroundColor: chrome.cardBg,
        borderRadius: HEALTH_LAYOUT.cardRadius,
        padding: HEALTH_LAYOUT.cardPadding,
        borderWidth: chrome.borderWidth,
        borderColor: chrome.borderColor,
        ...(isDark ? {} : HEALTH_ELEVATION.cardLight),
      };

  return (
    <Animated.View
      style={{
        flexDirection: "row",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: HEALTH_LAYOUT.cardGap,
        paddingHorizontal: HEALTH_LAYOUT.screenPaddingX,
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
      }}
    >
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
          <Image source={MILO_AVATAR} style={{ width: 30, height: 30 }} contentFit="contain" />
        </View>
      )}

      <View style={bubbleStyle}>
        <MiloMessageBody content={message.content} variant={isUser ? "user" : "assistant"} />
        {!isUser && message.fileAttachments && message.fileAttachments.length > 0 ? (
          <MiloFileAttachmentChips attachments={message.fileAttachments} />
        ) : null}
        <Text
          style={{
            color: isUser ? "rgba(255,255,255,0.75)" : theme.secondary,
            fontSize: 11,
            marginTop: 8,
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
