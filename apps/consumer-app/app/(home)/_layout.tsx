import { MiloChatModal } from "@/components/chat/MiloChatModal";
import { ChatProvider } from "@/context/chatContext";
import { useTheme } from "@/context/themeContext";
import { useMessageThreadsRealtime } from "@/hooks/useMessageThreadsRealtime";
import { Slot } from "expo-router";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeLayout() {
  const { theme } = useTheme();
  const { bottom } = useSafeAreaInsets();

  // Refetch message threads when new messages arrive so nav bar unread count updates
  useMessageThreadsRealtime();

  return (
    <ChatProvider>
      <View
        className="flex-1"
        style={{
          backgroundColor: theme.background,
          paddingBottom: Platform.OS === "android" ? bottom : 0,
        }}
      >
        <Slot />
      </View>
      <MiloChatModal />
    </ChatProvider>
  );
}
