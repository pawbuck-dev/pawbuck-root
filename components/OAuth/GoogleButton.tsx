import { supabase } from "@/utils/supabase";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Image } from "expo-image";
import React, { useState } from "react";
import { Alert, Pressable, Text } from "react-native";

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: true,
});

type GoogleButtonProps = {
  onSuccess?: () => Promise<void> | void;
};

const GoogleButton = ({ onSuccess }: GoogleButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);

      // Check if device supports Google Play Services (Android)
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Get user info and tokens from Google
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data?.idToken) {
        throw new Error("No ID token returned from Google Sign-In");
      }

      // Sign in to Supabase with Google ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: userInfo.data.idToken,
      });

      if (error) {
        throw error;
      }

      console.log("Successfully signed in with Google:", data);

      // Call onSuccess callback to navigate to home
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("User cancelled the login flow");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log("Sign in is in progress already");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          "Error",
          "Google Play Services is not available or outdated"
        );
      } else {
        console.error("Error signing in with Google:", error);
        Alert.alert("Error", error.message || "Failed to sign in with Google");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Pressable
      onPress={signInWithGoogle}
      disabled={isLoading}
      className="w-[60%] rounded-full border-2 border-gray-300 bg-white py-3 px-6 flex-row items-center justify-center gap-3 active:opacity-70"
    >
      <Image
        source={require("@/assets/icons/google.svg")}
        style={{ width: 24, height: 24 }}
        contentFit="contain"
      />
      <Text className="text-gray-800 text-start font-semibold">
        Sign in with Google
      </Text>
    </Pressable>
  );
};

export default GoogleButton;
