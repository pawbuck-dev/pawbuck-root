import OAuthLogins from "@/components/OAuth/OAuth";
import { useTheme } from "@/context/themeContext";
import { useCreatePetFromOnboardingDraft } from "@/hooks/useCreatePetFromOnboardingDraft";
import { needsDisplayNamePrompt } from "@/services/authDisplayName";
import { upsertUserPreferences } from "@/services/userPreferences";
import { supabase } from "@/utils/supabase";
import {
  authResumeParamsForNavigation,
  authResumeParamsToRouteParams,
  hasAuthResumeTarget,
  parseAuthResumeParams,
} from "@/utils/authResumeParams";
import type { User } from "@supabase/supabase-js";
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

function Login() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const rawParams = useLocalSearchParams<{
    returnTo?: string;
    transferCode?: string;
    inviteCode?: string;
    inviteToken?: string;
  }>();
  const resume = parseAuthResumeParams(rawParams);
  const { returnTo, transferCode, inviteCode, inviteToken } = resume;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const createPetIfNeeded = useCreatePetFromOnboardingDraft();

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
      if (hasAuthResumeTarget(resume)) {
        router.replace({
          pathname: returnTo as any,
          params: authResumeParamsToRouteParams(resume),
        });
      } else {
        router.replace("/(home)/home");
      }
    } catch (error: any) {
      console.error("Error signing in:", error);
      Alert.alert("Error", error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    router.replace({
      pathname: "/signup",
      params: authResumeParamsForNavigation(resume),
    });
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
          params: authResumeParamsForNavigation(resume),
        });
        return;
      }

      await createPetIfNeeded();
      if (hasAuthResumeTarget(resume)) {
        router.replace({
          pathname: returnTo as any,
          params: authResumeParamsToRouteParams(resume),
        });
      } else {
        router.replace("/(home)/home");
      }
    } catch (error: any) {
      console.error("Error during OAuth login:", error);
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
              <View className="mb-12 items-center">
                <Text
                  className="text-4xl font-bold text-center mb-3"
                  style={{ color: theme.foreground }}
                >
                  Welcome Back
                </Text>
                <Text
                  className="text-lg text-center"
                  style={{ color: theme.foreground, opacity: 0.7 }}
                >
                  Sign in to manage your pets
                </Text>
              </View>

              <OAuthLogins onSuccess={onOAuthSuccess} />

              <View className="flex-row items-center gap-4 my-6">
                <View
                  className="flex-1 h-px"
                  style={{ backgroundColor: theme.foreground, opacity: 0.2 }}
                />
                <Text
                  className="text-sm uppercase"
                  style={{ color: theme.foreground, opacity: 0.5 }}
                >
                  Or continue with email
                </Text>
                <View
                  className="flex-1 h-px"
                  style={{ backgroundColor: theme.foreground, opacity: 0.2 }}
                />
              </View>

              <View className="mb-4">
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
                    mode === "dark"
                      ? "rgba(255,255,255,0.4)"
                      : "rgba(0,0,0,0.4)"
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  className="w-full rounded-xl py-4 px-4 text-start"
                  style={{
                    backgroundColor:
                      mode === "dark"
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    color: theme.foreground,
                  }}
                  editable={!isLoading}
                />
              </View>

              <View className="mb-6">
                <Text
                  className="text-start font-medium mb-2"
                  style={{ color: theme.foreground }}
                >
                  Password
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={
                    mode === "dark"
                      ? "rgba(255,255,255,0.4)"
                      : "rgba(0,0,0,0.4)"
                  }
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  className="w-full rounded-xl py-4 px-4 text-start"
                  style={{
                    backgroundColor:
                      mode === "dark"
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    color: theme.foreground,
                  }}
                  editable={!isLoading}
                  onSubmitEditing={handleEmailLogin}
                />
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/forgot-password",
                      params: email.trim() ? { email: email.trim() } : {},
                    })
                  }
                  disabled={isLoading}
                  className="mt-2 self-end"
                >
                  <Text className="text-sm font-medium" style={{ color: theme.primary }}>
                    Forgot password?
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleEmailLogin}
                disabled={isLoading}
                className="w-full rounded-xl py-4 items-center active:opacity-80 mb-6"
                style={{
                  backgroundColor: isLoading ? theme.primary + "80" : "#5EEAD4",
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                <Text className="text-lg font-semibold text-gray-900">
                  {isLoading ? "Signing In..." : "Sign In"}
                </Text>
              </Pressable>

              <View className="flex-row items-center justify-center gap-2">
                <Text
                  className="text-start"
                  style={{ color: theme.foreground, opacity: 0.7 }}
                >
                  Don't have an account?
                </Text>
                <Pressable onPress={handleSignUp} disabled={isLoading}>
                  <Text
                    className="text-start font-semibold"
                    style={{ color: theme.primary }}
                  >
                    Sign up
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

export default Login;
