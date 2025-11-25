import OAuthLogins from "@/components/OAuth/OAuth";
import { useTheme } from "@/context/themeContext";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
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

function SignUp() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      console.log("Successfully signed up:", data);

      // Show success message
      Alert.alert(
        "Success",
        "Account created successfully! Please check your email to verify your account.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/home"),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error signing up:", error);
      Alert.alert("Error", error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.replace("/login");
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
              {/* Header */}
              <View className="mb-12 items-center">
                <Text
                  className="text-4xl font-bold text-center mb-3"
                  style={{ color: theme.foreground }}
                >
                  Create Account
                </Text>
                <Text
                  className="text-lg text-center"
                  style={{ color: theme.foreground, opacity: 0.7 }}
                >
                  Sign up to save your pet's profile
                </Text>
              </View>

              {/* Google Sign In */}
              <OAuthLogins onSuccess={() => router.replace("/(tabs)/home")} />

              {/* Divider */}
              <View className="flex-row items-center gap-4 my-6">
                <View
                  className="flex-1 h-px"
                  style={{ backgroundColor: theme.foreground, opacity: 0.2 }}
                />
                <Text
                  className="text-sm uppercase"
                  style={{ color: theme.foreground, opacity: 0.5 }}
                >
                  OR SIGN UP WITH EMAIL
                </Text>
                <View
                  className="flex-1 h-px"
                  style={{ backgroundColor: theme.foreground, opacity: 0.2 }}
                />
              </View>

              {/* Email Input */}
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

              {/* Password Input */}
              <View className="mb-4">
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
                />
              </View>

              {/* Confirm Password Input */}
              <View className="mb-6">
                <Text
                  className="text-start font-medium mb-2"
                  style={{ color: theme.foreground }}
                >
                  Confirm Password
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
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
                  onSubmitEditing={handleEmailSignUp}
                />
              </View>

              {/* Sign Up Button */}
              <Pressable
                onPress={handleEmailSignUp}
                disabled={isLoading}
                className="w-full rounded-xl py-4 items-center active:opacity-80 mb-6"
                style={{
                  backgroundColor: isLoading ? theme.primary + "80" : "#5EEAD4", // Teal color
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                <Text className="text-lg font-semibold text-gray-900">
                  {isLoading ? "Creating Account..." : "Sign Up"}
                </Text>
              </Pressable>

              {/* Sign In Link */}
              <View className="flex-row items-center justify-center gap-2">
                <Text
                  className="text-start"
                  style={{ color: theme.foreground, opacity: 0.7 }}
                >
                  Already have an account?
                </Text>
                <Pressable onPress={handleSignIn} disabled={isLoading}>
                  <Text
                    className="text-start font-semibold"
                    style={{ color: theme.primary }}
                  >
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

export default SignUp;
