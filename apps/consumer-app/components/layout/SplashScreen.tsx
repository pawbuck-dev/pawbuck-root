import { useTheme } from "@/context/themeContext";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

/**
 * Splash screen — Figma node 1592:38599 (dark).
 * Dark teal bg, radial glow, centered PawBuck logo, no text.
 */
interface SplashScreenProps {
  onFinish: () => void;
}

const OVERLAY_TINT_DARK = "rgba(11,150,150,0.06)";
const OVERLAY_TINT_LIGHT = "rgba(43,168,158,0.08)";

const LOGO_SIZE = 199;

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const overlayTint = isDark ? OVERLAY_TINT_DARK : OVERLAY_TINT_LIGHT;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, []);

  const gradientColors = isDark
    ? (["#082226", "#0B181C", theme.background] as const)
    : (["#E4F2F1", "#EEF6F5", theme.background] as const);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Code gradient replaces splash-bg.png — that asset shipped with a sharp centered rectangle artifact */}
      <LinearGradient
        colors={[...gradientColors]}
        locations={[0, 0.42, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View
        style={[styles.overlay, { backgroundColor: overlayTint }]}
        pointerEvents="none"
      />

      {/* Centered PawBuck logo (Figma "pawbuck-logo" 1592:38610, 199×199) */}
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Image
          source={require("@/assets/images/splash-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});
