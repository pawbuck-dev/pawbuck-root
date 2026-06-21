import { StartWalkWalkerIcon } from "@/components/pawthon/StartWalkWalkerIcon";
import { useTheme } from "@/context/themeContext";
import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";
import { LayoutChangeEvent, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const TRACK_HEIGHT = 52;
const THUMB_SIZE = 44;
const TRACK_PADDING = 4;
const CONFIRM_RATIO = 0.82;

type Props = {
  onStartWalk: () => void;
  walkProgress: number;
  todayMi: string;
  goalMi: string;
  walkGoalMeters: number;
  goalMet?: boolean;
  petName?: string;
};

export default function StartWalkSlider({
  onStartWalk,
  walkProgress,
  todayMi,
  goalMi,
  walkGoalMeters,
  goalMet = false,
  petName,
}: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const maxDrag = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragStart = useSharedValue(0);

  const triggerStart = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onStartWalk();
  }, [onStartWalk]);

  const resetThumb = useCallback(() => {
    dragX.value = withSpring(0, { damping: 18, stiffness: 220 });
  }, [dragX]);

  const pan = Gesture.Pan()
    .activeOffsetX(8)
    .failOffsetY([-12, 12])
    .onBegin(() => {
      dragStart.value = dragX.value;
    })
    .onUpdate((event) => {
      const next = dragStart.value + event.translationX;
      dragX.value = Math.min(Math.max(0, next), maxDrag.value);
    })
    .onEnd(() => {
      if (maxDrag.value <= 0) return;
      if (dragX.value >= maxDrag.value * CONFIRM_RATIO) {
        dragX.value = withSpring(maxDrag.value, { damping: 20, stiffness: 260 });
        runOnJS(triggerStart)();
        runOnJS(resetThumb)();
      } else {
        dragX.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const onTrackLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    maxDrag.value = Math.max(0, width - THUMB_SIZE - TRACK_PADDING * 2);
  };

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }],
  }));

  const hintStyle = useAnimatedStyle(() => {
    const limit = maxDrag.value;
    const opacity = limit > 0 ? interpolate(dragX.value, [0, limit * 0.35], [1, 0.15]) : 1;
    return { opacity };
  });

  const goalFill = Math.max(walkProgress > 0 ? 6 : 0, Math.round(walkProgress * 100));

  return (
    <View
      onLayout={onTrackLayout}
      style={{
        width: "100%",
        height: TRACK_HEIGHT,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
        borderWidth: 1,
        borderColor: isDark ? "rgba(56,189,189,0.4)" : "rgba(59,208,210,0.5)",
        backgroundColor: isDark ? "rgba(56,189,189,0.08)" : "rgba(59,208,210,0.1)",
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${goalFill}%`,
          backgroundColor: isDark ? "rgba(56,189,189,0.22)" : "rgba(59,208,210,0.2)",
        }}
      />

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: THUMB_SIZE + TRACK_PADDING * 2 + 4,
          right: 12,
          top: 0,
          bottom: 0,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Animated.Text
          style={[
            hintStyle,
            {
              fontSize: 14,
              fontWeight: "700",
              color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.35)",
            },
          ]}
        >
          Slide to start walk
        </Animated.Text>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.foreground }}>
            {walkGoalMeters > 0 ? `${todayMi} / ${goalMi} mi` : `${todayMi} mi`}
          </Text>
          <Text style={{ fontSize: 10, color: theme.secondary, marginTop: 1 }}>
            {goalMet ? "Goal met" : "Daily goal"}
          </Text>
        </View>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View
          accessibilityRole="adjustable"
          accessibilityLabel={`Slide to start a walk with ${petName ?? "your pet"}`}
          accessibilityHint="Drag the control to the right to begin a walk"
          style={[
            {
              position: "absolute",
              left: TRACK_PADDING,
              top: TRACK_PADDING,
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.primary,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 4,
              elevation: 3,
            },
            thumbStyle,
          ]}
        >
          <StartWalkWalkerIcon size={38} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
