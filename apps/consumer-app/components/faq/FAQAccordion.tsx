import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

/**
 * FAQ list item — PawBuck App Redesign, Figma dark FAQ screen (node 1340:29227).
 * Card: white @ 6% on page bg, radius 12; question row uses slightly taller vertical rhythm than Figma.
 * List vertical gap between cards: 8. Inner gap (question → answer): 6.
 */
interface FAQAccordionProps {
  question: string;
  answer: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const FIGMA_CARD_RADIUS = 12;
/** Shared horizontal inset for question + answer text (same value so edges line up). */
const FIGMA_PAD_LEFT = 16;
const FIGMA_PAD_RIGHT = 12;
/** Bottom padding of the answer block (expanded). */
const FIGMA_PAD_VERTICAL = 16;
const FIGMA_LIST_GAP = 8;
const FIGMA_INNER_GAP = 6;

/** Question header T/B padding — ~30% taller than base 16 for clearer tap targets and rhythm. */
const FAQ_HEADER_PAD_VERTICAL = Math.round(16 * 1.3);

const FAQ_QUESTION_FONT_SIZE = 16;
/** Line box for questions — scaled with header padding (~30% over base 20). */
const FAQ_QUESTION_LINE_HEIGHT = Math.round(20 * 1.3);
const FAQ_ANSWER_FONT_SIZE = 14;
const FAQ_ANSWER_LINE_HEIGHT = 20;

const FAQ_ICON_SIZE = 24;
/** Horizontal gap between wrapped question text and the chevron column. */
const FAQ_TEXT_CHEVRON_GAP = 12;

export default function FAQAccordion({
  question,
  answer,
  isExpanded,
  onToggle,
}: FAQAccordionProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const rotation = useSharedValue(isExpanded ? 180 : 0);

  useEffect(() => {
    rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 200 });
  }, [isExpanded, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const chrome = useMemo(() => {
    if (isDark) {
      return {
        cardBg: "rgba(255, 255, 255, 0.06)" as const,
        // Figma FAQ tiles are fill-only (no stroke on the card frame).
        border: {},
        divider: "rgba(255, 255, 255, 0.08)" as const,
        chevron: theme.secondary,
      };
    }
    return {
      cardBg: "#FFFFFF" as const,
      border:
        Platform.OS === "android"
          ? {}
          : { borderWidth: 1 as const, borderColor: "rgba(0, 0, 0, 0.06)" },
      divider: "rgba(0, 0, 0, 0.08)" as const,
      chevron: "#616E82",
    };
  }, [isDark, theme.secondary]);

  const questionStyle = useMemo(
    () => [
      styles.question,
      {
        color: theme.foreground,
        fontSize: FAQ_QUESTION_FONT_SIZE,
        lineHeight: FAQ_QUESTION_LINE_HEIGHT,
        fontFamily: "Poppins_600SemiBold",
      },
      Platform.OS === "android" ? { includeFontPadding: false } : null,
    ],
    [theme.foreground]
  );

  const answerStyle = useMemo(
    () => [
      styles.answer,
      {
        color: theme.secondary,
        fontSize: FAQ_ANSWER_FONT_SIZE,
        lineHeight: FAQ_ANSWER_LINE_HEIGHT,
        fontFamily: "Poppins_400Regular",
      },
      Platform.OS === "android" ? { includeFontPadding: false } : null,
    ],
    [theme.secondary]
  );

  return (
    <View
      style={[
        styles.card,
        {
          width: "100%",
          alignSelf: "stretch",
          backgroundColor: chrome.cardBg,
          borderRadius: FIGMA_CARD_RADIUS,
          marginBottom: FIGMA_LIST_GAP,
          ...chrome.border,
        },
      ]}
    >
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.headerPressable,
          {
            paddingLeft: 0,
            paddingRight: FIGMA_PAD_RIGHT,
            paddingTop: FAQ_HEADER_PAD_VERTICAL,
            paddingBottom: isExpanded ? FIGMA_INNER_GAP : FAQ_HEADER_PAD_VERTICAL,
            opacity: pressed ? 0.92 : 1,
            direction: "ltr",
          },
        ]}
      >
        <View style={styles.questionRow}>
          <View style={styles.questionTextSlot}>
            <Text style={questionStyle}>{question}</Text>
          </View>
          <View
            style={styles.chevronColumn}
            collapsable={false}
            pointerEvents="none"
          >
            <Animated.View style={[styles.iconSpin, animatedStyle]}>
              <Ionicons name="chevron-down" size={20} color={chrome.chevron} />
            </Animated.View>
          </View>
        </View>
      </Pressable>

      {isExpanded && (
        <View style={styles.answerSection}>
          <View style={[styles.divider, { backgroundColor: chrome.divider, marginBottom: FIGMA_INNER_GAP }]} />
          <Text style={answerStyle}>{answer}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
  headerPressable: {
    width: "100%",
  },
  /**
   * Row + flex-start keeps the chevron on the first line for wrapped questions (no “center of card”
   * illusion from absolute/stacking quirks). Text column shrinks so wrapping stays left of the icon.
   */
  questionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
  },
  questionTextSlot: {
    flex: 1,
    minWidth: 0,
    marginRight: FAQ_TEXT_CHEVRON_GAP,
    paddingLeft: FIGMA_PAD_LEFT,
  },
  question: {
    fontWeight: "600",
    width: "100%",
  },
  chevronColumn: {
    width: FAQ_ICON_SIZE,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 1,
  },
  iconSpin: {
    justifyContent: "center",
    alignItems: "center",
  },
  answerSection: {
    paddingLeft: FIGMA_PAD_LEFT,
    paddingRight: FIGMA_PAD_RIGHT,
    paddingBottom: FIGMA_PAD_VERTICAL,
  },
  divider: {
    height: 1,
    alignSelf: "stretch",
  },
  answer: {},
});
