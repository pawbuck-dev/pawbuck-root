import type { MiloChatFileAttachment } from "@/utils/miloChatApi";
import { useTheme } from "@/context/themeContext";
import { getCachedSignedUrl } from "@/utils/image";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback } from "react";
import { Alert, Pressable, ScrollView, Text } from "react-native";

interface MiloFileAttachmentChipsProps {
  attachments: MiloChatFileAttachment[];
}

export const MiloFileAttachmentChips: React.FC<MiloFileAttachmentChipsProps> = ({ attachments }) => {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const openDoc = useCallback(async (path: string) => {
    const url = await getCachedSignedUrl(path);
    if (!url) {
      Alert.alert("Document", "This file is no longer available.");
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.warn("openBrowserAsync", e);
      Alert.alert("Document", "Could not open this file.");
    }
  }, []);

  if (!attachments.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: 10 }}
      contentContainerStyle={{ flexDirection: "row", gap: 8, paddingRight: 4 }}
    >
      {attachments.map((a) => (
        <Pressable
          key={`${a.kind}-${a.id}`}
          onPress={() => void openDoc(a.storagePath)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            maxWidth: 200,
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.12)" : theme.border,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Ionicons name="document-text-outline" size={18} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: "600", color: theme.foreground }} numberOfLines={1}>
            {a.title || "Document"}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};
