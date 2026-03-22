import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type UploadSheetOption = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Figma: PDF row uses a doc tile with “PDF” label instead of a plain outline icon */
  usePdfBadge?: boolean;
  onPress: () => void;
};

type HealthRecordsUploadSheetProps = {
  visible: boolean;
  title: string;
  options: UploadSheetOption[];
  onClose: () => void;
};

function PdfLeadingIcon({
  foreground,
  isDark,
}: {
  foreground: string;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        marginRight: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#E8EAEE",
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? "rgba(255,255,255,0.12)" : "transparent",
      }}
    >
      <Ionicons name="document-text-outline" size={18} color={foreground} />
      <Text
        style={{
          marginTop: 1,
          fontSize: 9,
          fontWeight: "800",
          letterSpacing: 0.4,
          color: foreground,
        }}
      >
        PDF
      </Text>
    </View>
  );
}

export default function HealthRecordsUploadSheet({
  visible,
  title,
  options,
  onClose,
}: HealthRecordsUploadSheetProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { bottom } = useSafeAreaInsets();

  const sheetBg = isDark ? "#1E2B2B" : "#FFFFFF";
  const rowBg = isDark ? "rgba(255,255,255,0.07)" : "#F3F4F6";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={[
            {
              backgroundColor: sheetBg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: bottom + 16,
            },
            !isDark && styles.sheetShadow,
          ]}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              letterSpacing: -0.2,
              color: theme.foreground,
              marginBottom: 14,
              textAlign: "left",
            }}
          >
            {title}
          </Text>
          <View style={{ gap: 10 }}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => {
                  opt.onPress();
                  onClose();
                }}
                activeOpacity={0.72}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 16,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: rowBg,
                }}
              >
                {opt.usePdfBadge ? (
                  <PdfLeadingIcon foreground={theme.foreground} isDark={isDark} />
                ) : (
                  <View
                    style={{
                      width: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    <Ionicons name={opt.icon} size={24} color={theme.foreground} />
                  </View>
                )}
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "500",
                    color: theme.foreground,
                    flex: 1,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheetShadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      default: {},
    }),
  },
});
