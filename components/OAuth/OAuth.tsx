import { View } from "react-native";
import AppleButton from "./AppleButton";
import GoogleButton from "./GoogleButton";

interface OAuthProps {
  onSuccess?: () => Promise<void> | void;
}

export default function OAuth({ onSuccess }: OAuthProps) {
  return (
    <View className="w-full items-center justify-center gap-4">
      <GoogleButton onSuccess={onSuccess} />
      <AppleButton onSuccess={onSuccess} />
    </View>
  );
}
