import { useChat } from "@/context/chatContext";
import { useTheme } from "@/context/themeContext";
import { Image } from "expo-image";
import React from "react";
import { TouchableOpacity, View } from "react-native";

// Milo mascot image
const MILO_AVATAR = require("@/assets/images/milo-avatar.gif");

interface MiloChatButtonProps {
  onPress?: () => void;
}

export const MiloChatButton: React.FC<MiloChatButtonProps> = ({ onPress }) => {
  const { theme } = useTheme();
  const { openChat } = useChat();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      openChat();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={{
        position: "absolute",
        bottom: 30,
        right: 20,
        zIndex: 1000,
      }}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: theme.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Image
          source={MILO_AVATAR}
          style={{ width: 50, height: 50 }}
          contentFit="contain"
        />
      </View>
      
      {/* Online indicator */}
      <View
        style={{
          position: "absolute",
          top: 2,
          right: 2,
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: "#5FC4C0",
          borderWidth: 2,
          borderColor: theme.card,
        }}
      />
    </TouchableOpacity>
  );
};
