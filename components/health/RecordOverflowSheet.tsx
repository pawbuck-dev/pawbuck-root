import { useTheme } from "@/context/themeContext";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type OverflowAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

export function RecordOverflowSheet({
  visible,
  onClose,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  actions: OverflowAction[];
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFillObject, { paddingTop: insets.top + 48 }]}
        >
          <View
            style={{
              alignSelf: "flex-end",
              marginRight: 16,
              minWidth: 208,
              borderRadius: 14,
              overflow: "hidden",
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            {actions.map((a, i) => (
              <TouchableOpacity
                key={`${a.label}-${i}`}
                onPress={() => {
                  onClose();
                  a.onPress();
                }}
                activeOpacity={0.7}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderBottomWidth: i < actions.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "500",
                    color: a.destructive ? "#FF3B30" : theme.foreground,
                  }}
                >
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
});
