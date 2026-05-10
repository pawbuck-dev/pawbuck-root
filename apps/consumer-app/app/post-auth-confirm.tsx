import { useOnboarding } from "@/context/onboardingContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { TablesInsert } from "@/database.types";
import {
  needsDisplayNamePrompt,
  persistOwnerDisplayNameForSession,
} from "@/services/authDisplayName";
import { upsertUserPreferences } from "@/services/userPreferences";
import { supabase } from "@/utils/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function paramToString(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

/**
 * After OAuth: confirm account + save pet from onboarding draft; optional inline name when the provider did not supply one.
 */
export default function PostAuthConfirmScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { isOnboardingComplete, petData, resetOnboarding } = useOnboarding();
  const { addPet } = usePets();
  const params = useLocalSearchParams<{
    returnTo?: string | string[];
    transferCode?: string | string[];
    inviteCode?: string | string[];
  }>();

  const returnTo = paramToString(params.returnTo);
  const transferCode = paramToString(params.transferCode);
  const inviteCode = paramToString(params.inviteCode);

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [showNameField, setShowNameField] = useState(false);

  const createPetIfNeeded = useCallback(async () => {
    if (isOnboardingComplete && petData?.name) {
      try {
        await addPet(petData as TablesInsert<"pets">);
      } catch (e) {
        console.error("[post-auth-confirm] addPet", e);
      } finally {
        resetOnboarding();
      }
    }
  }, [isOnboardingComplete, petData, addPet, resetOnboarding]);

  const goHomeOrReturn = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      await upsertUserPreferences(user.id, {}).catch(() => {});
    }
    await createPetIfNeeded();
    if (returnTo && (transferCode || inviteCode)) {
      router.replace({
        pathname: returnTo as never,
        params: transferCode ? { transferCode } : { inviteCode },
      });
    } else {
      router.replace("/home");
    }
  }, [createPetIfNeeded, returnTo, transferCode, inviteCode, router]);

  const goHomeOrReturnRef = useRef(goHomeOrReturn);
  goHomeOrReturnRef.current = goHomeOrReturn;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!needsDisplayNamePrompt(user)) {
          await goHomeOrReturnRef.current();
          return;
        }
        setShowNameField(true);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSkip = useCallback(async () => {
    setBusy(true);
    try {
      await goHomeOrReturn();
    } finally {
      setBusy(false);
    }
  }, [goHomeOrReturn]);

  const onContinue = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name", "Enter a name or tap Skip.");
      return;
    }
    setBusy(true);
    try {
      await persistOwnerDisplayNameForSession(trimmed);
      await goHomeOrReturn();
    } catch (e: unknown) {
      console.error("[post-auth-confirm] continue", e);
      Alert.alert("Error", "Could not save your name. Try again.");
    } finally {
      setBusy(false);
    }
  }, [name, goHomeOrReturn]);

  const petLabel = petData?.name?.trim() || "your pet";
  const petLine =
    isOnboardingComplete && petData?.name
      ? `We'll save ${petLabel}'s profile to your account.`
      : "You're ready to use PawBuck.";

  if (booting) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StatusBar style={isDark ? "light" : "dark"} />
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: Math.max(insets.top, 24),
            paddingHorizontal: 24,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: theme.foreground,
              marginBottom: 8,
            }}
          >
            You're signed in
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: theme.secondary,
              marginBottom: 24,
              lineHeight: 22,
            }}
          >
            {petLine}
          </Text>

          {showNameField ? (
            <View style={{ marginBottom: 8 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.foreground,
                  marginBottom: 8,
                }}
              >
                What should we call you?
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.secondary,
                  marginBottom: 12,
                  lineHeight: 20,
                }}
              >
                We could not read a name from your sign-in. Add one for a personalized greeting, or skip
                to continue as “Hi there!”.
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={theme.secondary}
                autoCapitalize="words"
                editable={!busy}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: theme.foreground,
                  marginBottom: 16,
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                }}
                onSubmitEditing={() => void onContinue()}
              />
            </View>
          ) : null}

          <Pressable
            onPress={() => void onContinue()}
            disabled={busy}
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              marginBottom: 12,
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator color={theme.primaryForeground} />
            ) : (
              <Text style={{ fontSize: 17, fontWeight: "600", color: theme.primaryForeground }}>
                Continue
              </Text>
            )}
          </Pressable>
          {showNameField ? (
            <Pressable onPress={() => void onSkip()} disabled={busy}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.secondary,
                  textAlign: "center",
                  paddingVertical: 12,
                }}
              >
                Skip
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
