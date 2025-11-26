import { View } from "react-native";
import GoogleButton from "./GoogleButton";

interface OAuthProps {
  onSuccess?: () => Promise<void>;
}

export default function OAuth({ onSuccess }: OAuthProps) {
  return (
    <View className="w-full items-center justify-center">
      <GoogleButton onSuccess={onSuccess} />
    </View>
  );
}
