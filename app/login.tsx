import Header from "@/components/Header";
import OAuthLogins from "@/components/OAuth/OAuth";
import { useOnboarding } from "@/context/onboardingContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { TablesInsert } from "@/database.types";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
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
  const { isOnboardingComplete, petData, resetOnboarding } = useOnboarding();
  const { addPet } = usePets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Helper to create pet if onboarding data exists
  const createPetIfNeeded = async () => {
    if (isOnboardingComplete && petData?.name) {
      try {
        console.log("Creating pet from login:", petData);
        // Use addPet from usePets hook which properly updates React Query cache
        await addPet(petData as TablesInsert<"pets">);
        console.log("Pet created successfully from login");
      } catch (error) {
        console.error("Error creating pet during login:", error);
        // Don't throw - continue to home even if pet creation fails
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      // Create pet if onboarding data exists (wait for completion before navigating)
      await createPetIfNeeded();

      // Navigate to home screen after successful login - clear stack
      router.dismissAll();
      router.replace("/home");
    } catch (error: any) {
      console.error("Error signing in:", error);
      Alert.alert("Error", error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    // Navigate to onboarding for new account setup
    router.push("/onboarding/step1");
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <Header />

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
                  Welcome Back
                </Text>
                <Text
                  className="text-lg text-center"
                  style={{ color: theme.foreground, opacity: 0.7 }}
                >
                  Sign in to manage your pets
                </Text>
              </View>

              {/* Google Sign In */}
              <OAuthLogins
                onSuccess={async () => {
                  try {
                    setIsLoading(true);
                    // Create pet if onboarding data exists (wait for completion before navigating)
                    await createPetIfNeeded();
                    // Clear navigation stack before going to home
                    router.dismissAll();
                    router.replace("/home");
                  } catch (error: any) {
                    console.error("Error during OAuth login:", error);
                  } finally {
                    setIsLoading(false);
                  }
                }}
              />

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
                  OR CONTINUE WITH EMAIL
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
              </View>

              {/* Sign In Button */}
              <Pressable
                onPress={handleEmailLogin}
                disabled={isLoading}
                className="w-full rounded-xl py-4 items-center active:opacity-80 mb-6"
                style={{
                  backgroundColor: isLoading ? theme.primary + "80" : "#5EEAD4", // Teal color from the design
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                <Text className="text-lg font-semibold text-gray-900">
                  {isLoading ? "Signing In..." : "Sign In"}
                </Text>
              </Pressable>

              {/* Sign Up Link */}
              <View className="flex-row items-center justify-center gap-2">
                <Text
                  className="text-start"
                  style={{ color: theme.foreground, opacity: 0.7 }}
                >
                  New here?
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
