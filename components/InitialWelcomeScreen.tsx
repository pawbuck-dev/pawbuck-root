/**
 * Welcome screen matching provided design:
 * Dark teal background, "PawBuck" + "Pet Life. Simplified." top-left,
 * central dog+cat illustration, "Get Started" (primary) + "Sign In" (outline) at bottom.
 * Uses CTA component from Figma Elements (44:408).
 */
import { CTA } from "@/components/ui";
import { useTheme } from "@/context/themeContext";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DARK_BG = "#1B2D2F";
const LIGHT_BG = "#F2F8F8";

export default function InitialWelcomeScreen() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = mode === "dark";
  const bg = isDark ? DARK_BG : LIGHT_BG;
  const accent = isDark ? "#5FC4C0" : "#2BA89E";
  const textPrimary = isDark ? "#FFFFFF" : "#1D2433";

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: bg }]} />
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Top-left: PawBuck + Pet Life. Simplified. */}
      <View style={[styles.header, { paddingTop: insets.top + 16, paddingLeft: 24, paddingRight: 24 }]}>
        <Text style={[styles.brand, { color: textPrimary }]}>PawBuck</Text>
        <View style={styles.taglineRow}>
          <Text style={[styles.tagline, { color: textPrimary }]}>Pet Life.</Text>
          <Text style={[styles.taglineAccent, { color: accent }]}> Simplified.</Text>
        </View>
      </View>

      {/* Center: hero illustration (dog + cat) */}
      <View style={styles.heroWrap}>
        <Image
          source={require("@/assets/images/splash-hero.png")}
          style={styles.hero}
          resizeMode="contain"
        />
      </View>

      {/* Bottom: Figma CTA — Get Started (Solid) + Sign In (Outline), full-width */}
      <View style={[styles.footer, { paddingBottom: Math.max(24, insets.bottom), paddingHorizontal: 24 }]}>
        <CTA
          label="Get Started"
          size="LG"
          style="Solid"
          onPress={() => router.push("/onboarding/step2")}
          containerStyle={styles.ctaBtn}
        />
        <CTA
          label="Sign In"
          size="LG"
          style="Outline"
          onPress={() => router.push("/login")}
          containerStyle={styles.ctaBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    alignSelf: "stretch",
  },
  brand: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  taglineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tagline: {
    fontSize: 28,
    fontWeight: "700",
  },
  taglineAccent: {
    fontSize: 28,
    fontWeight: "700",
  },
  heroWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  hero: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: 390 / 408,
  },
  footer: {
    width: "100%",
    gap: 12,
  },
  ctaBtn: {
    width: "100%",
    alignSelf: "stretch",
  },
});
