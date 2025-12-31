import { useTheme } from "@/context/themeContext";
import { Slot } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeLayout() {
  const { theme } = useTheme();
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: theme.background,
        paddingBottom: bottom,
      }}
    >
      <Slot />
    </View>
  );
}
