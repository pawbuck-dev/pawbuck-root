import { useTheme } from "@/context/themeContext";
import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ProfileEditModalProps = {
  visible: boolean;
  onClose: () => void;
  topInset: number;
  editingPhone: string;
  setEditingPhone: (v: string) => void;
  editingAddress: string;
  setEditingAddress: (v: string) => void;
  onSave: () => void;
  isSaving: boolean;
};

export function ProfileEditModal({
  visible,
  onClose,
  topInset,
  editingPhone,
  setEditingPhone,
  editingAddress,
  setEditingAddress,
  onSave,
  isSaving,
}: ProfileEditModalProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          backgroundColor: theme.background,
          paddingTop: Platform.OS === "android" ? topInset : 0,
        }}
      >
        <View
          className="px-6 pt-4 pb-4 border-b"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose} disabled={isSaving}>
              <Text className="text-base" style={{ color: theme.primary }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold" style={{ color: theme.foreground }}>
              Edit profile
            </Text>
            <TouchableOpacity onPress={onSave} disabled={isSaving}>
              <Text
                className="text-base font-semibold"
                style={{
                  color: isSaving ? theme.secondary : theme.primary,
                }}
              >
                {isSaving ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
            Phone number
          </Text>
          <TextInput
            className="rounded-xl py-4 px-4 text-base mb-4"
            style={{
              backgroundColor: theme.card,
              color: theme.foreground,
              borderColor: theme.border,
              borderWidth: 1,
            }}
            value={editingPhone}
            onChangeText={setEditingPhone}
            placeholder="Enter phone number"
            placeholderTextColor={theme.secondary}
            keyboardType="phone-pad"
          />
          <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
            Address
          </Text>
          <TextInput
            className="rounded-xl py-4 px-4 text-base mb-6"
            style={{
              backgroundColor: theme.card,
              color: theme.foreground,
              borderColor: theme.border,
              borderWidth: 1,
            }}
            value={editingAddress}
            onChangeText={setEditingAddress}
            placeholder="Enter address"
            placeholderTextColor={theme.secondary}
            multiline
            numberOfLines={3}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
