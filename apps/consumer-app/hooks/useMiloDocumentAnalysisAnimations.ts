import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

/** Status copy shown while upload/analysis pipeline is active (cycles every 3.5s). */
export const MILO_DOC_ANALYSIS_STATUS_PHASES = [
  "Reading your document...",
  "Finding dates & vaccines...",
  "Matching regional requirements...",
  "Almost there...",
] as const;

const SPIN_MS = 2000;
const BREATH_HALF_MS = 1200;
const SONAR_MS = 2000;
export const MILO_DOC_ANALYSIS_STATUS_CYCLE_MS = 3500;

const MILO_AVATAR_SIZE = 141;
/** Fixed hero box — sonar scales to 1.4× avatar without shifting layout. */
export const MILO_BUSY_HERO_BOX_SIZE = Math.ceil(MILO_AVATAR_SIZE * 1.4);
export const MILO_AVATAR_FRAME_SIZE = MILO_AVATAR_SIZE;

export type MiloDocumentAnalysisAnimationFlags = {
  /** Spin `GeneratingIcon` in the composer busy bar. */
  spin: boolean;
  /** Breathing Milo + sonar ring in the empty-thread hero. */
  hero: boolean;
};

/**
 * Native-driver animation loops for Milo document analysis busy UI.
 * Each loop starts only when its flag is true; values reset when flags turn off.
 */
export function useMiloDocumentAnalysisAnimations({
  spin,
  hero,
}: MiloDocumentAnalysisAnimationFlags) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const sonar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spin) {
      spinAnim.stopAnimation(() => spinAnim.setValue(0));
      return;
    }

    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: SPIN_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    spinLoop.start();
    return () => spinLoop.stop();
  }, [spin, spinAnim]);

  useEffect(() => {
    if (!hero) {
      breath.stopAnimation(() => breath.setValue(0));
      sonar.stopAnimation(() => sonar.setValue(0));
      return;
    }

    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: BREATH_HALF_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: BREATH_HALF_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const sonarLoop = Animated.loop(
      Animated.timing(sonar, {
        toValue: 1,
        duration: SONAR_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );

    breathLoop.start();
    sonarLoop.start();

    return () => {
      breathLoop.stop();
      sonarLoop.stop();
    };
  }, [hero, breath, sonar]);

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const breathScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const sonarScale = sonar.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });

  const sonarOpacity = sonar.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  });

  return { spinRotate, breathScale, sonarScale, sonarOpacity };
}

/** Cycles document-analysis status copy while the pipeline is busy. */
export function useMiloDocumentAnalysisStatusCopy(isActive: boolean): string {
  const phaseIndexRef = useRef(0);
  const [statusCopy, setStatusCopy] = useState<string>(MILO_DOC_ANALYSIS_STATUS_PHASES[0]);

  useEffect(() => {
    if (!isActive) {
      phaseIndexRef.current = 0;
      setStatusCopy(MILO_DOC_ANALYSIS_STATUS_PHASES[0]);
      return;
    }

    setStatusCopy(MILO_DOC_ANALYSIS_STATUS_PHASES[0]);
    phaseIndexRef.current = 0;

    const id = setInterval(() => {
      phaseIndexRef.current =
        (phaseIndexRef.current + 1) % MILO_DOC_ANALYSIS_STATUS_PHASES.length;
      setStatusCopy(MILO_DOC_ANALYSIS_STATUS_PHASES[phaseIndexRef.current]);
    }, MILO_DOC_ANALYSIS_STATUS_CYCLE_MS);

    return () => clearInterval(id);
  }, [isActive]);

  return statusCopy;
}
