import { PawthonWalkShareCard } from "@/components/pawthon/PawthonWalkShareCard";
import { PAWTHON_TEAL } from "@/constants/pawthonUi";
import { useTheme } from "@/context/themeContext";
import { shareWalkStoryFromRef } from "@/services/walkShare";
import type { WalkSharePayload } from "@/utils/walkShareCard";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  payload: WalkSharePayload | null;
  onClose: () => void;
};

export function PawthonWalkSharePreviewModal({ visible, payload, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (!payload || sharing) return;
    setSharing(true);
    try {
      await new Promise((r) => setTimeout(r, 80));
      await shareWalkStoryFromRef(cardRef, payload);
      onClose();
    } finally {
      setSharing(false);
    }
  }, [payload, sharing, onClose]);

  if (!payload) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: theme.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 20),
            maxHeight: "92%",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 }}>
            <Text style={{ flex: 1, fontFamily: "Poppins_700Bold", fontSize: 18, color: theme.foreground }}>
              Share story
            </Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={26} color={theme.foreground} />
            </Pressable>
          </View>

          <Text
            style={{
              fontFamily: "Poppins_500Medium",
              fontSize: 13,
              color: theme.secondary,
              paddingHorizontal: 20,
              marginBottom: 16,
            }}
          >
            Preview your walk for Instagram Stories or WhatsApp Status
          </Text>

          <ScrollView
            contentContainerStyle={{ alignItems: "center", paddingHorizontal: 20, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <PawthonWalkShareCard ref={cardRef} payload={payload} />
          </ScrollView>

          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            <Pressable onPress={handleShare} disabled={sharing}>
              <LinearGradient
                colors={[PAWTHON_TEAL, "#1FA8A8"]}
                style={{
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  opacity: sharing ? 0.7 : 1,
                }}
              >
                {sharing ? (
                  <ActivityIndicator color="#FFFFFF" style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="share-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                )}
                <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 17, color: "#FFFFFF" }}>
                  {sharing ? "Preparing…" : "Share"}
                </Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={onClose} style={{ alignItems: "center", paddingVertical: 8 }}>
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 14, color: theme.secondary }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
