import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import {
  createSessionFromAuthUrl,
  MIN_PASSWORD_LENGTH,
  updatePassword,
} from "@/services/authPasswordReset";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type ResetState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { clearPendingPasswordRecovery } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isChangeMode = params.mode === "change";

  const [resetState, setResetState] = useState<ResetState>(
    isChangeMode ? { status: "ready" } : { status: "loading" }
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAuthUrl = useCallback(async (url: string | null) => {
    if (!url || isChangeMode) return;

    try {
      setResetState({ status: "loading" });
      await createSessionFromAuthUrl(url);
      setResetState({ status: "ready" });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "This reset link is invalid or has expired.";
      setResetState({ status: "error", message });
    }
  }, [isChangeMode]);

  useEffect(() => {
    if (isChangeMode) return;

    void Linking.getInitialURL().then((url) => void handleAuthUrl(url));

    const subscription = Linking.addEventListener("url", (event) => {
      void handleAuthUrl(event.url);
    });

    return () => subscription.remove();
  }, [handleAuthUrl, isChangeMode]);

  const handleSubmit = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert("Error", `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    try {
      setIsSaving(true);
      await updatePassword(password);
      clearPendingPasswordRecovery();
      Alert.alert("Password updated", "Your password has been saved.", [
        { text: "OK", onPress: () => router.replace("/(home)/home") },
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not update password.";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  };

  if (resetState.status === "loading") {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.background }}
      >
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <ActivityIndicator size="large" color={theme.primary} />
        <Text className="mt-4 text-center" style={{ color: theme.foreground, opacity: 0.7 }}>
          Verifying reset link…
        </Text>
      </View>
    );
  }

  if (resetState.status === "error") {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.background }}
      >
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <Text
          className="text-xl font-semibold text-center mb-3"
          style={{ color: theme.foreground }}
        >
          Link expired
        </Text>
        <Text className="text-center mb-6" style={{ color: theme.foreground, opacity: 0.7 }}>
          {resetState.message}
        </Text>
        <Pressable
          onPress={() => router.replace("/forgot-password")}
          className="rounded-xl py-3 px-6"
          style={{ backgroundColor: "#5EEAD4" }}
        >
          <Text className="font-semibold text-gray-900">Request a new link</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 items-center justify-center px-6 py-12">
            <View className="w-full max-w-md">
              <View className="mb-10 items-center">
                <Text
                  className="text-4xl font-bold text-center mb-3"
                  style={{ color: theme.foreground }}
                >
                  {isChangeMode ? "Change password" : "New password"}
                </Text>
                <Text
                  className="text-lg text-center"
                  style={{ color: theme.foreground, opacity: 0.7 }}
                >
                  {isChangeMode
                    ? "Choose a new password for your PawBuck account."
                    : "Choose a new password to finish resetting your account."}
                </Text>
              </View>

              <View className="mb-4">
                <Text
                  className="text-start font-medium mb-2"
                  style={{ color: theme.foreground }}
                >
                  New password
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={
                    mode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"
                  }
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  className="w-full rounded-xl py-4 px-4 text-start"
                  style={{
                    backgroundColor:
                      mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    color: theme.foreground,
                  }}
                  editable={!isSaving}
                />
              </View>

              <View className="mb-6">
                <Text
                  className="text-start font-medium mb-2"
                  style={{ color: theme.foreground }}
                >
                  Confirm password
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={
                    mode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"
                  }
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  className="w-full rounded-xl py-4 px-4 text-start"
                  style={{
                    backgroundColor:
                      mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    color: theme.foreground,
                  }}
                  editable={!isSaving}
                  onSubmitEditing={() => void handleSubmit()}
                />
              </View>

              <Pressable
                onPress={() => void handleSubmit()}
                disabled={isSaving}
                className="w-full rounded-xl py-4 items-center active:opacity-80"
                style={{
                  backgroundColor: isSaving ? theme.primary + "80" : "#5EEAD4",
                  opacity: isSaving ? 0.6 : 1,
                }}
              >
                <Text className="text-lg font-semibold text-gray-900">
                  {isSaving ? "Saving…" : "Save password"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
