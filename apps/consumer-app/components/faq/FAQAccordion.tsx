import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface FAQAccordionProps {
  question: string;
  answer: string;
  isExpanded: boolean;
  onToggle: () => void;
}

/** Card chrome aligned with Care Team / Dashboard tiles */
const tileBorder = (isDark: boolean) =>
  Platform.OS === "android"
    ? {}
    : {
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      };

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

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const bodyMuted = isDark ? "rgba(255,255,255,0.6)" : "#5A5F6A";

  /**
   * Leading padding a bit wider than trailing: avoids left-edge glyph clipping.
   * We avoid `overflow: 'hidden'` on the card so rounded corners don’t clip anti-aliased text;
   * the card fill + border still use borderRadius; the press target is transparent inside.
   */
  const padLead = 28;
  const padTrail = 20;

  const questionLineHeight = 22;
  const questionTextStyle = {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: theme.foreground,
    lineHeight: questionLineHeight,
    ...(Platform.OS === "ios"
      ? { paddingLeft: 1 }
      : Platform.OS === "android"
        ? { includeFontPadding: false }
        : null),
  };

  const headerPadV = 16;
  /** Reserve trailing space so question text never runs under the absolutely positioned chevron. */
  const chevronSlot = 32;

  return (
    <View
      style={[
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
          borderRadius: 24,
          marginBottom: 14,
          ...tileBorder(isDark),
        },
      ]}
    >
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => ({
          position: "relative",
          alignSelf: "stretch",
          width: "100%",
          paddingTop: headerPadV,
          paddingBottom: headerPadV,
          paddingLeft: padLead + 4,
          paddingRight: padTrail + chevronSlot,
          // English FAQ: chevron stays on the visual right.
          direction: "ltr",
          opacity: pressed ? 0.88 : 1,
        })}
      >
        <Text style={questionTextStyle}>{question}</Text>
        <Animated.View
          style={[
            animatedStyle,
            {
              position: "absolute",
              end: padTrail,
              top: headerPadV,
              width: 28,
              height: questionLineHeight,
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="chevron-down" size={20} color={isDark ? theme.secondary : "#1D2433"} />
        </Animated.View>
      </Pressable>

      {isExpanded && (
        <View
          style={{
            paddingLeft: padLead + 4,
            paddingRight: padTrail,
            paddingBottom: 16,
          }}
        >
          <View
            style={{
              height: 1,
              marginBottom: 12,
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            }}
          />
          <Text
            style={[
              { fontSize: 14, lineHeight: 20, color: bodyMuted, fontFamily: "Poppins_400Regular" },
              Platform.OS === "ios" ? { paddingLeft: 1 } : null,
              Platform.OS === "android" ? { includeFontPadding: false } : null,
            ]}
          >
            {answer}
          </Text>
        </View>
      )}
    </View>
  );
}
