import OAuthLogins from "@/components/OAuth/OAuth";
import { useOnboarding } from "@/context/onboardingContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { TablesInsert } from "@/database.types";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  Image,
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
  const [showLoginForm, setShowLoginForm] = useState(false);

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
    // Navigate to welcome screen with options
    router.push("/welcome");
  };

  // If showing login form, show the form-based UI
  if (showLoginForm) {
    return (
      <View className="flex-1" style={{ backgroundColor: "#0A0A0A" }}>
        <StatusBar style="light" />

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
                {/* Back Button */}
                <Pressable
                  onPress={() => setShowLoginForm(false)}
                  className="flex-row items-center mb-8 active:opacity-70"
                >
                  <Text className="text-base" style={{ color: "#9CA3AF" }}>
                    ← Back
                  </Text>
                </Pressable>

                {/* Header */}
                <View className="mb-12 items-center">
                  <Text
                    className="text-4xl font-bold text-center mb-3"
                    style={{ color: "#FFFFFF" }}
                  >
                    Welcome Back
                  </Text>
                  <Text
                    className="text-lg text-center"
                    style={{ color: "#9CA3AF" }}
                  >
                    Sign in to manage your pets
                  </Text>
                </View>

                {/* Google Sign In */}
                <OAuthLogins
                  onSuccess={async () => {
                    try {
                      setIsLoading(true);
                      await createPetIfNeeded();
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
                    style={{ backgroundColor: "#9CA3AF", opacity: 0.2 }}
                  />
                  <Text
                    className="text-sm uppercase"
                    style={{ color: "#9CA3AF", opacity: 0.5 }}
                  >
                    OR CONTINUE WITH EMAIL
                  </Text>
                  <View
                    className="flex-1 h-px"
                    style={{ backgroundColor: "#9CA3AF", opacity: 0.2 }}
                  />
                </View>

                {/* Email Input */}
                <View className="mb-4">
                  <Text
                    className="text-start font-medium mb-2"
                    style={{ color: "#FFFFFF" }}
                  >
                    Email
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    className="w-full rounded-xl py-4 px-4 text-start"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.1)",
                      color: "#FFFFFF",
                    }}
                    editable={!isLoading}
                  />
                </View>

                {/* Password Input */}
                <View className="mb-6">
                  <Text
                    className="text-start font-medium mb-2"
                    style={{ color: "#FFFFFF" }}
                  >
                    Password
                  </Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                    className="w-full rounded-xl py-4 px-4 text-start"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.1)",
                      color: "#FFFFFF",
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
                    backgroundColor: isLoading ? "#5FC4C080" : "#5FC4C0",
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  <Text className="text-lg font-semibold" style={{ color: "#FFFFFF" }}>
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

  // Default view - matching the screenshot design
  return (
    <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: "#0A0A0A" }}>
      <StatusBar style="light" />

      <View className="w-full max-w-md items-center">
        {/* Logo */}
        <Image
          source={require("@/assets/images/icon.png")}
          style={{ width: 120, height: 120, marginBottom: 48 }}
          resizeMode="contain"
        />

        {/* Welcome Message */}
        <View className="mb-12 items-center">
          <Text
            className="text-4xl font-bold text-center mb-4"
            style={{ color: "#FFFFFF" }}
          >
            Welcome to PawBuck
          </Text>
          <Text
            className="text-lg text-center"
            style={{ color: "#9CA3AF" }}
          >
            Your pet&apos;s health, all in one place
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="w-full gap-4">
          {/* Sign Up Button */}
          <Pressable
            onPress={handleSignUp}
            className="w-full rounded-2xl py-5 px-6 items-center active:opacity-90"
            style={{ backgroundColor: "#5FC4C0" }}
          >
            <Text
              className="text-lg font-semibold mb-1"
              style={{ color: "#FFFFFF" }}
            >
              Sign Up
            </Text>
            <Text
              className="text-sm"
              style={{ color: "#FFFFFF", opacity: 0.9 }}
            >
              Create your PawBuck account
            </Text>
          </Pressable>

          {/* Sign In Button */}
          <Pressable
            onPress={() => setShowLoginForm(true)}
            className="w-full rounded-2xl py-5 px-6 items-center active:opacity-90"
            style={{ backgroundColor: "#1F1F1F" }}
          >
            <Text
              className="text-lg font-semibold mb-1"
              style={{ color: "#FFFFFF" }}
            >
              Sign In
            </Text>
            <Text
              className="text-sm"
              style={{ color: "#FFFFFF", opacity: 0.9 }}
            >
              Welcome back
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default Login;
