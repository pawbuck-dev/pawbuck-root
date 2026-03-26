/**
 * Figma UI Design (Dark) — Profile logout confirmation, node 1340:29077 (modal).
 * Glass card, logout icon well, title + body, Cancel (outline) + Yes, Log Out (destructive pill).
 */
import { CTA } from "@/components/ui/CTA";
import { useTheme } from "@/context/themeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const BODY_COPY = "You'll be signed out of your account on this device.";

export type LogOutConfirmModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSigningOut?: boolean;
};

export function LogOutConfirmModal({
  visible,
  onClose,
  onConfirm,
  isSigningOut = false,
}: LogOutConfirmModalProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const titleColor = theme.foreground;
  const bodyColor = isDark ? "rgba(162, 169, 169, 1)" : theme.secondary;
  const iconWellBg = isDark ? "rgba(229, 29, 34, 0.1)" : "rgba(239, 68, 68, 0.12)";
  const iconWellBorder = isDark ? "rgba(229, 29, 34, 0.2)" : "rgba(239, 68, 68, 0.28)";
  const cardBorder = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.08)";
  const androidCardBg = isDark ? "rgba(255, 255, 255, 0.1)" : "#FFFFFF";

  const content = (
    <>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: iconWellBg,
          borderWidth: 1,
          borderColor: iconWellBorder,
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "center",
          marginBottom: 12,
        }}
      >
        <MaterialCommunityIcons name="logout-variant" size={24} color={theme.error} />
      </View>

      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            fontSize: 20,
            color: titleColor,
            textAlign: "center",
          }}
        >
          Log Out?
        </Text>
        <Text
          style={{
            fontFamily: "Poppins_400Regular",
            fontSize: 14,
            lineHeight: 20,
            color: bodyColor,
            textAlign: "center",
            marginTop: 6,
          }}
        >
          {BODY_COPY}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 12, alignItems: "stretch" }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <CTA
            label="Cancel"
            onPress={onClose}
            size="MD"
            style="Outline"
            disabled={isSigningOut}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <CTA
            label="Yes, Log Out"
            onPress={onConfirm}
            size="MD"
            style="Solid"
            state="Destructive"
            disabled={isSigningOut}
          />
        </View>
      </View>

      {isSigningOut ? (
        <View
          style={[StyleSheet.absoluteFillObject, styles.loadingOverlay]}
          pointerEvents="auto"
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : null}
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={isSigningOut ? () => {} : onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={isSigningOut ? undefined : onClose}
          accessibilityLabel="Dismiss"
        />
        <View style={styles.sheet} pointerEvents="box-none">
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={isDark ? 42 : 64}
              tint={isDark ? "dark" : "light"}
              style={[styles.cardBlur, { borderColor: cardBorder }]}
            >
              <View
                style={[
                  styles.cardInner,
                  { backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.72)" },
                ]}
              >
                {content}
              </View>
            </BlurView>
          ) : (
            <View style={[styles.cardAndroid, { backgroundColor: androidCardBg, borderColor: cardBorder }]}>
              {content}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 350,
    zIndex: 1,
  },
  cardBlur: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardInner: {
    padding: 20,
    position: "relative",
  },
  cardAndroid: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  loadingOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
