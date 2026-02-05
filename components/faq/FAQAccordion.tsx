import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
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

export default function FAQAccordion({
  question,
  answer,
  isExpanded,
  onToggle,
}: FAQAccordionProps) {
  const { theme } = useTheme();
  const rotation = useSharedValue(isExpanded ? 90 : 0);

  useEffect(() => {
    rotation.value = withTiming(isExpanded ? 90 : 0, { duration: 200 });
  }, [isExpanded, rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View
      className="mb-3 rounded-2xl overflow-hidden"
      style={{ backgroundColor: theme.card }}
    >
      <Pressable
        onPress={onToggle}
        className="flex-row items-center justify-between p-4 active:opacity-80"
      >
        <View className="flex-1 pr-4">
          <Text
            className="text-base font-semibold"
            style={{ color: theme.foreground }}
          >
            {question}
          </Text>
        </View>
        <Animated.View style={animatedStyle}>
          <Ionicons
            name="chevron-down"
            size={20}
            color={theme.primary}
          />
        </Animated.View>
      </Pressable>

      {isExpanded && (
        <View className="px-4 pb-4">
          <View
            className="h-px mb-3"
            style={{ backgroundColor: theme.border }}
          />
          <Text
            className="text-sm leading-6"
            style={{ color: theme.secondary }}
          >
            {answer}
          </Text>
        </View>
      )}
    </View>
  );
}
