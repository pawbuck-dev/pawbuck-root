import { requestPasswordReset } from "@/services/authPasswordReset";
import { useTheme } from "@/context/themeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    try {
      setIsLoading(true);
      const { message } = await requestPasswordReset(email);
      Alert.alert("Check your email", message, [
        { text: "Back to sign in", onPress: () => router.replace("/login") },
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not send reset email.";
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  };

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
                  Reset password
                </Text>
                <Text
                  className="text-lg text-center"
                  style={{ color: theme.foreground, opacity: 0.7 }}
                >
                  Enter the email on your PawBuck account. We will send a link to set a new
                  password.
                </Text>
              </View>

              <View className="mb-6">
                <Text
                  className="text-start font-medium mb-2"
                  style={{ color: theme.foreground }}
                >
                  Email
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={
                    mode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  className="w-full rounded-xl py-4 px-4 text-start"
                  style={{
                    backgroundColor:
                      mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    color: theme.foreground,
                  }}
                  editable={!isLoading}
                />
              </View>

              <Pressable
                onPress={() => void handleSubmit()}
                disabled={isLoading}
                className="w-full rounded-xl py-4 items-center active:opacity-80 mb-6"
                style={{
                  backgroundColor: isLoading ? theme.primary + "80" : "#5EEAD4",
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                <Text className="text-lg font-semibold text-gray-900">
                  {isLoading ? "Sending…" : "Send reset link"}
                </Text>
              </Pressable>

              <View className="flex-row items-center justify-center gap-2">
                <Text className="text-start" style={{ color: theme.foreground, opacity: 0.7 }}>
                  Remember your password?
                </Text>
                <Pressable onPress={() => router.replace("/login")} disabled={isLoading}>
                  <Text className="text-start font-semibold" style={{ color: theme.primary }}>
                    Sign in
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
