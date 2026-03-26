import { useTheme } from "@/context/themeContext";
import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

interface FAQAccordionProps {
  question: string;
  answer: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const FAQ_PAD_HORIZONTAL = 20;
const FAQ_PAD_VERTICAL = 20;
const FAQ_ICON_SIZE = 24;
/** Fine-tune vertical alignment with the first line of the question (line-height {FAQ_QUESTION_LINE_HEIGHT}). */
const FAQ_ICON_TOP_NUDGE = 2;
const FAQ_QUESTION_LINE_HEIGHT = 22;
const FAQ_QUESTION_FONT_SIZE = 16;
const CHEVRON_TEXT_GAP = 12;

const FAQ_ANSWER_FONT_SIZE = 14;
const FAQ_ANSWER_LINE_HEIGHT = 20;

const HEADER_MIN_HEIGHT = 60;
const CARD_RADIUS = 16;
const CONTENT_PULL_UP = -4;

export default function FAQAccordion({
  question,
  answer,
  isExpanded,
  onToggle,
}: FAQAccordionProps) {
  const { theme } = useTheme();

  const borderStyle = useMemo(() => {
    if (Platform.OS === "android") return {};
    return {
      borderWidth: 1 as const,
      borderColor: theme.border,
    };
  }, [theme.border]);

  const questionPaddingRight = FAQ_PAD_HORIZONTAL + FAQ_ICON_SIZE + CHEVRON_TEXT_GAP;

  /** Pinned to card top-right; aligns with first line: same vertical inset as question padding + nudge. */
  const iconTop = FAQ_PAD_VERTICAL + FAQ_ICON_TOP_NUDGE;
  const iconRight = FAQ_PAD_HORIZONTAL;

  const questionTextStyle = useMemo(
    () => [
      styles.question,
      {
        color: theme.foreground,
        lineHeight: FAQ_QUESTION_LINE_HEIGHT,
        fontSize: FAQ_QUESTION_FONT_SIZE,
        fontFamily: "Poppins_600SemiBold",
      },
      Platform.OS === "android" ? { includeFontPadding: false } : null,
    ],
    [theme.foreground]
  );

  const answerTextStyle = useMemo(
    () => [
      styles.answerText,
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

  const iconTextStyle = useMemo(
    () => [styles.iconText, { color: theme.foreground }],
    [theme.foreground]
  );

  return (
    <View
      style={[
        styles.card,
        {
          position: "relative",
          width: "100%",
          alignSelf: "stretch",
          backgroundColor: theme.card,
          borderRadius: CARD_RADIUS,
          ...borderStyle,
        },
      ]}
    >
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.headerPressable,
          {
            paddingLeft: FAQ_PAD_HORIZONTAL,
            paddingRight: questionPaddingRight,
            paddingTop: FAQ_PAD_VERTICAL,
            paddingBottom: FAQ_PAD_VERTICAL,
            minHeight: HEADER_MIN_HEIGHT,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <Text style={questionTextStyle}>{question}</Text>
      </Pressable>

      <View
        pointerEvents="none"
        style={[
          styles.plusIcon,
          {
            position: "absolute",
            top: iconTop,
            right: iconRight,
            width: FAQ_ICON_SIZE,
            height: FAQ_ICON_SIZE,
          },
        ]}
      >
        <Text style={iconTextStyle}>{isExpanded ? "−" : "+"}</Text>
      </View>

      {isExpanded && (
        <View style={styles.answerBlock}>
          <Text style={answerTextStyle}>{answer}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    overflow: "hidden",
  },
  /** No flex row — block layout; icon is positioned relative to the card. */
  headerPressable: {
    width: "100%",
  },
  question: {
    fontWeight: "600",
  },
  plusIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 22,
    fontWeight: "300",
  },
  answerBlock: {
    paddingHorizontal: FAQ_PAD_HORIZONTAL,
    paddingBottom: FAQ_PAD_VERTICAL,
    marginTop: CONTENT_PULL_UP,
  },
  answerText: {},
});
