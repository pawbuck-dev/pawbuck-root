import OAuthLogins from "@/components/OAuth/OAuth";
import { useOnboarding } from "@/context/onboardingContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { TablesInsert } from "@/database.types";
import { needsDisplayNamePrompt } from "@/services/authDisplayName";
import { upsertUserPreferences } from "@/services/userPreferences";
import { supabase } from "@/utils/supabase";
import type { User } from "@supabase/supabase-js";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

/**
 * Login page — matches Figma PawBuck App Redesign:
 * Light: sign in 1386:42086, sign up 1386:42025 (bg #F2F8F8, white card).
 * Dark: sign in 1340:31106, sign up 1340:31045 (bg #182424, card white 6%).
 */
const FIGMA_LOGIN_LIGHT = {
  pageBg: "#F2F8F8",
  cardBg: "#FFFFFF",
  cardRadius: 28,
  padding: 20,
} as const;

const FIGMA_LOGIN_DARK = {
  pageBg: "#182424",
  cardBg: "rgba(255,255,255,0.06)",
  cardRadius: 28,
  padding: 20,
} as const;

function Login() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { isOnboardingComplete, petData, resetOnboarding } = useOnboarding();
  const { addPet } = usePets();
  const { returnTo, transferCode, inviteCode } = useLocalSearchParams<{ returnTo?: string; transferCode?: string; inviteCode?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const isDark = mode === "dark";
  const figma = isDark ? FIGMA_LOGIN_DARK : FIGMA_LOGIN_LIGHT;

  const createPetIfNeeded = async () => {
    if (isOnboardingComplete && petData?.name) {
      try {
        await addPet(petData as TablesInsert<"pets">);
      } catch (error) {
        console.error("Error creating pet during login:", error);
      } finally {
        resetOnboarding();
      }
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      await createPetIfNeeded();
      if (returnTo && (transferCode || inviteCode)) {
        router.replace({
          pathname: returnTo as any,
          params: transferCode ? { transferCode } : { inviteCode },
        });
      } else {
        router.replace("/home");
      }
    } catch (error: any) {
      console.error("Error signing in:", error);
      Alert.alert("Error", error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const onOAuthSuccess = async (user: User) => {
    try {
      setIsLoading(true);
      await upsertUserPreferences(user.id, {});

      const {
        data: { user: latest },
      } = await supabase.auth.getUser();
      if (needsDisplayNamePrompt(latest ?? user)) {
        router.replace({
          pathname: "/post-auth-confirm",
          params: {
            returnTo: returnTo ? String(returnTo) : "",
            transferCode: transferCode ? String(transferCode) : "",
            inviteCode: inviteCode ? String(inviteCode) : "",
          },
        });
        return;
      }

      await createPetIfNeeded();
      if (returnTo && (transferCode || inviteCode)) {
        router.replace({
          pathname: returnTo as any,
          params: transferCode ? { transferCode } : { inviteCode },
        });
      } else {
        router.replace("/home");
      }
    } catch (error: any) {
      console.error("Error during OAuth login:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: figma.pageBg }]} />
      <StatusBar style={isDark ? "light" : "dark"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex1}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top spacer (status + header area) */}
          <View style={{ height: 104 }} />
          <View style={{ paddingHorizontal: figma.padding, marginBottom: 24 }}>
            <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>
              <Text style={{ fontSize: 16, color: theme.secondary }}>← Back</Text>
            </Pressable>
          </View>

            {/* Bottom card — sign in form (Figma: white / white 6% dark, radius 28) */}
            <View
              style={{
                flex: 1,
                backgroundColor: figma.cardBg,
                borderTopLeftRadius: figma.cardRadius,
                borderTopRightRadius: figma.cardRadius,
                paddingHorizontal: figma.padding,
                paddingTop: 24,
                paddingBottom: Math.max(40, insets.bottom),
              }}
            >
              <View style={{ gap: 24 }}>
                <View style={{ alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontSize: 30, fontWeight: "700", color: theme.foreground }}>
                    Welcome Back
                  </Text>
                  <Text style={{ fontSize: 16, color: theme.secondary, marginTop: 8, textAlign: "center" }}>
                    Sign in to manage your pets
                  </Text>
                </View>

                <OAuthLogins onSuccess={onOAuthSuccess} />

                <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginVertical: 8 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
                  <Text style={{ fontSize: 12, textTransform: "uppercase", color: theme.secondary, opacity: 0.8 }}>
                    Or continue with email
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: theme.foreground, marginBottom: 8 }}>
                    Email
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.secondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!isLoading}
                    style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                      color: theme.foreground,
                      borderRadius: 12,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      fontSize: 16,
                    }}
                  />
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: theme.foreground, marginBottom: 8 }}>
                    Password
                  </Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={theme.secondary}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                    editable={!isLoading}
                    onSubmitEditing={handleEmailLogin}
                    style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                      color: theme.foreground,
                      borderRadius: 12,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      fontSize: 16,
                    }}
                  />
                </View>

                <Pressable
                  onPress={handleEmailLogin}
                  disabled={isLoading}
                  style={{
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    paddingVertical: 16,
                    alignItems: "center",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: "600", color: theme.primaryForeground }}>
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
});

export default Login;
