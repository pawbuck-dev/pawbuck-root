import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import {
  acceptPetFamilyInviteToken,
  petFamilyInviteErrorMessage,
  resolveInviteTokenFromParams,
} from "@/services/petFamilyInvites";
import { authResumeParamsForNavigation } from "@/utils/authResumeParams";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AcceptState =
  | { status: "loading" }
  | { status: "success"; role: string }
  | { status: "error"; message: string };

export default function AcceptInviteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ token?: string; inviteToken?: string }>();
  const token = resolveInviteTokenFromParams(params);
  const [state, setState] = useState<AcceptState>({ status: "loading" });
  const attemptedRef = useRef(false);

  const promptAuth = useCallback(() => {
    if (!token) {
      Alert.alert("Invalid link", "This invite link is missing a token.");
      router.replace("/");
      return;
    }
    Alert.alert(
      "Sign in required",
      "Sign in or create an account with the email address that received this invite.",
      [
        { text: "Cancel", style: "cancel", onPress: () => router.replace("/") },
        {
          text: "Sign Up",
          onPress: () =>
            router.replace({
              pathname: "/signup",
              params: {
                ...authResumeParamsForNavigation({
                  returnTo: "/accept-invite",
                  inviteToken: token,
                }),
              },
            }),
        },
        {
          text: "Sign In",
          onPress: () =>
            router.replace({
              pathname: "/login",
              params: {
                ...authResumeParamsForNavigation({
                  returnTo: "/accept-invite",
                  inviteToken: token,
                }),
              },
            }),
        },
      ]
    );
  }, [router, token]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setState({ status: "error", message: "This invite link is invalid." });
      return;
    }
    if (!isAuthenticated) {
      promptAuth();
      return;
    }
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    (async () => {
      try {
        const result = await acceptPetFamilyInviteToken(token);
        await queryClient.invalidateQueries({ queryKey: ["pets"] });
        setState({ status: "success", role: result.role });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to accept invite";
        setState({ status: "error", message: msg });
      }
    })();
  }, [authLoading, isAuthenticated, token, promptAuth, queryClient]);

  const handleContinue = () => {
    router.replace("/(home)/home");
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 24),
          justifyContent: "center",
        }}
      >
        {state.status === "loading" && (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ marginTop: 16, fontSize: 18, color: theme.foreground }}>
              Accepting your invite…
            </Text>
          </View>
        )}

        {state.status === "success" && (
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.primary + "22",
                marginBottom: 24,
              }}
            >
              <MaterialCommunityIcons name="check-circle" size={56} color={theme.primary} />
            </View>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: theme.foreground,
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              You&apos;re on the care team
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: theme.secondary,
                textAlign: "center",
                marginBottom: 32,
                lineHeight: 24,
              }}
            >
              Access level: {state.role.replace("_", " ")}. Open Home to see the shared pet.
            </Text>
            <Pressable
              testID="accept-invite-continue-home"
              accessibilityRole="button"
              accessibilityLabel="Continue to Home"
              onPress={handleContinue}
              style={{
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingVertical: 16,
                paddingHorizontal: 32,
                width: "100%",
                maxWidth: 320,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "600", color: theme.primaryForeground }}>
                Continue to Home
              </Text>
            </Pressable>
          </View>
        )}

        {state.status === "error" && (
          <View style={{ alignItems: "center" }}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={56}
              color={theme.secondary}
              style={{ marginBottom: 16 }}
            />
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: theme.foreground,
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Could not accept invite
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: theme.secondary,
                textAlign: "center",
                marginBottom: 24,
                lineHeight: 24,
              }}
            >
              {state.message}
            </Text>
            {!isAuthenticated && token ? (
              <Pressable
                onPress={promptAuth}
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: theme.primaryForeground, fontWeight: "600" }}>Sign in</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => router.replace("/")}>
              <Text style={{ color: theme.primary, fontWeight: "600" }}>Back to welcome</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
