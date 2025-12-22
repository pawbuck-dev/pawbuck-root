import { supabase } from "@/utils/supabase";
import * as AppleAuthentication from "expo-apple-authentication";
import { Alert, StyleSheet, View } from "react-native";

export default function AppleButton({ onSuccess }: { onSuccess?: () => void }) {
  return (
    <View className="w-full items-center justify-center">
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={100}
        style={{
          width: "60%",
          height: 45,
        }}
        onPress={async () => {
          try {
            const credential = await AppleAuthentication.signInAsync({
              requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
              ],
            });
            if (!credential.identityToken) {
              throw new Error("No identity token returned from Apple Sign-In");
            }
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "apple",
              token: credential.identityToken,
            });
            if (error) {
              throw error;
            }
            onSuccess?.();
          } catch (e: any) {
            console.error("Error signing in with Apple:", e);
            Alert.alert("Error", e.message);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    width: 200,
    height: 44,
  },
});
