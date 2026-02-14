import { User } from "@supabase/supabase-js";
import { View } from "react-native";
import AppleButton from "./AppleButton";
import GoogleButton from "./GoogleButton";

interface OAuthProps {
  onSuccess: (user: User) => Promise<void> | void;
}

export default function OAuth({ onSuccess }: OAuthProps) {
  return (
    <View className="w-full items-center justify-center gap-4">
      <GoogleButton onSuccess={onSuccess} />
      <AppleButton onSuccess={onSuccess} />
    </View>
  );
}
