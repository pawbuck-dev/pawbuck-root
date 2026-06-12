import {
  MILO_AVATAR_FRAME_SIZE,
  MILO_BUSY_HERO_BOX_SIZE,
} from "@/hooks/useMiloDocumentAnalysisAnimations";
import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

const MILO_AVATAR = require("@/assets/images/milo_gif.gif");

const IDLE_FLOAT_MS = 4000;
const IDLE_FLOAT_DISTANCE = 9;

type AnalysisAnimationProps = {
  sonarOpacity: Animated.AnimatedInterpolation<number>;
  sonarScale: Animated.AnimatedInterpolation<number>;
  breathScale: Animated.AnimatedInterpolation<number>;
};

type Props = {
  primaryColor: string;
  isDark: boolean;
  /** Document upload / analysis busy — sonar + breath from parent hook. */
  analysisBusy?: boolean;
  analysisAnimations?: AnalysisAnimationProps;
  /** Gentle float when idle (empty thread, not analyzing). */
  idleFloatEnabled?: boolean;
};

export function MiloEmptyHero({
  primaryColor,
  isDark,
  analysisBusy = false,
  analysisAnimations,
  idleFloatEnabled = true,
}: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!idleFloatEnabled || analysisBusy) {
      floatAnim.stopAnimation(() => floatAnim.setValue(0));
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: IDLE_FLOAT_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: IDLE_FLOAT_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [idleFloatEnabled, analysisBusy, floatAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -IDLE_FLOAT_DISTANCE],
  });

  const showSonar = analysisBusy && analysisAnimations;
  const avatarScale = showSonar ? analysisAnimations!.breathScale : 1;
  const floatTransform = !analysisBusy && idleFloatEnabled ? [{ translateY }] : [];

  return (
    <View
      style={{
        width: MILO_BUSY_HERO_BOX_SIZE,
        height: MILO_BUSY_HERO_BOX_SIZE,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
      }}
    >
      {!analysisBusy && idleFloatEnabled ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: MILO_AVATAR_FRAME_SIZE * 1.45,
            height: MILO_AVATAR_FRAME_SIZE * 1.45,
            borderRadius: (MILO_AVATAR_FRAME_SIZE * 1.45) / 2,
            backgroundColor: isDark ? "rgba(84,186,183,0.12)" : "rgba(43,168,158,0.1)",
            opacity: 0.85,
          }}
        />
      ) : null}

      {showSonar ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: MILO_AVATAR_FRAME_SIZE,
            height: MILO_AVATAR_FRAME_SIZE,
            borderRadius: MILO_AVATAR_FRAME_SIZE / 2,
            borderWidth: 2,
            borderColor: primaryColor,
            backgroundColor: isDark ? "rgba(95, 196, 192, 0.14)" : "rgba(43, 168, 158, 0.14)",
            opacity: analysisAnimations!.sonarOpacity,
            transform: [{ scale: analysisAnimations!.sonarScale }],
          }}
        />
      ) : null}

      <Animated.View
        style={{
          transform: [...floatTransform, { scale: avatarScale }],
        }}
      >
        <View
          style={{
            width: MILO_AVATAR_FRAME_SIZE,
            height: MILO_AVATAR_FRAME_SIZE,
            borderRadius: MILO_AVATAR_FRAME_SIZE / 2,
            overflow: "hidden",
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
          }}
        >
          <Image
            source={MILO_AVATAR}
            style={{
              width: MILO_AVATAR_FRAME_SIZE,
              height: MILO_AVATAR_FRAME_SIZE,
            }}
            contentFit="cover"
          />
        </View>
      </Animated.View>
    </View>
  );
}
