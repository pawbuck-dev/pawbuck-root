import { useTheme } from "@/context/themeContext";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  fields: Record<string, string>;
  onSave: (fields: Record<string, string>) => void;
  onClose: () => void;
};

export function SummaryEditModal({ visible, fields, onSave, onClose }: Props) {
  const { theme } = useTheme();
  const [draft, setDraft] = useState<Record<string, string>>(fields);

  useEffect(() => {
    if (visible) setDraft({ ...fields });
  }, [visible, fields]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable
          style={{
            maxHeight: "80%",
            backgroundColor: theme.card,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 20,
            paddingBottom: 32,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.foreground, marginBottom: 12 }}>
            Edit summary fields
          </Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {Object.entries(draft).map(([key, value]) => (
              <View key={key} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.secondary, marginBottom: 4 }}>
                  {key}
                </Text>
                <TextInput
                  value={value}
                  onChangeText={(t) => setDraft((prev) => ({ ...prev, [key]: t }))}
                  multiline
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 10,
                    padding: 10,
                    color: theme.foreground,
                    minHeight: 44,
                  }}
                />
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            onPress={() => onSave(draft)}
            style={{
              marginTop: 8,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: theme.primary,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Apply edits</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12, alignItems: "center" }}>
            <Text style={{ color: theme.secondary }}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
