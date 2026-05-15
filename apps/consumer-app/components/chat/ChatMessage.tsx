import { resolveMiloAssistantFooter } from "@/services/miloAssistantFooter";
import { ChatMessage as ChatMessageType } from "@/context/chatContext";
import { HEALTH_ELEVATION, HEALTH_LAYOUT, healthListCardChrome } from "@/constants/figmaHealthLayout";
import { useTheme } from "@/context/themeContext";
import { submitMiloJournalFeedback } from "@/utils/miloChatApi";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { MiloFileAttachmentChips } from "./MiloFileAttachmentChips";
import { MiloMessageBody } from "./MiloMessageBody";

const MILO_AVATAR = require("@/assets/images/milo_gif.gif");

interface ChatMessageProps {
  message: ChatMessageType;
  isNew?: boolean;
  /**
   * When false, hides per-bubble thumbs (e.g. Milo health journal uses a single session feedback row).
   * @default true
   */
  showInlineTurnFeedback?: boolean;
  /** Journal triage screen — per-bubble footers are suppressed (session disclaimer already shown). */
  journalMode?: boolean;
}

function MiloTurnFeedbackRow({
  turnId,
  primaryColor,
  mutedColor,
}: {
  turnId: string;
  primaryColor: string;
  mutedColor: string;
}) {
  const [selected, setSelected] = useState<"up" | "down" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  const disabled = submitting || selected !== null;

  const submit = async (rating: "up" | "down") => {
    if (disabled) return;
    setSubmitting(true);
    try {
      await submitMiloJournalFeedback({ turnId, rating });
      setSelected(rating);
      pulse.setValue(1);
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.2,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (e) {
      console.warn("[MiloTurnFeedback]", e);
    } finally {
      setSubmitting(false);
    }
  };

  const upActive = selected === "up";
  const downActive = selected === "down";
  const upColor = upActive ? primaryColor : mutedColor;
  const downColor = downActive ? primaryColor : mutedColor;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <TouchableOpacity
        disabled={disabled}
        onPress={() => void submit("up")}
        hitSlop={10}
        accessibilityLabel="Thumbs up"
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: upActive ? pulse : 1 }] }}>
          <Ionicons name={upActive ? "thumbs-up" : "thumbs-up-outline"} size={18} color={upColor} />
        </Animated.View>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={disabled}
        onPress={() => void submit("down")}
        hitSlop={10}
        accessibilityLabel="Thumbs down"
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: downActive ? pulse : 1 }] }}>
          <Ionicons
            name={downActive ? "thumbs-down" : "thumbs-down-outline"}
            size={18}
            color={downColor}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isNew = true,
  showInlineTurnFeedback = true,
  journalMode = false,
}) => {
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

  const assistantFooter = !isUser
    ? resolveMiloAssistantFooter({
        content: message.content,
        usedPetData: message.usedPetData,
        usedRag: message.usedRag,
        isJournalMode: journalMode,
      })
    : null;

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
        {!isUser && assistantFooter ? (
          <Text
            style={{
              fontSize: 11,
              lineHeight: 15,
              color: theme.secondary,
              marginTop: 10,
            }}
            accessibilityRole="text"
          >
            {assistantFooter}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
            gap: 8,
          }}
        >
          <Text
            style={{
              color: isUser ? "rgba(255,255,255,0.75)" : theme.secondary,
              fontSize: 11,
              textAlign: "left",
              flexShrink: 0,
            }}
          >
            {formatTime(message.timestamp)}
          </Text>
          {!isUser && showInlineTurnFeedback && message.turnId ? (
            <View style={{ flexShrink: 0 }}>
              <MiloTurnFeedbackRow
                turnId={message.turnId}
                primaryColor={theme.primary}
                mutedColor={theme.secondary}
              />
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
