import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
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
  editingName: string;
  setEditingName: (v: string) => void;
  editingPhone: string;
  setEditingPhone: (v: string) => void;
  editingAddress: string;
  setEditingAddress: (v: string) => void;
  photoPreviewUri: string | null;
  onChangePhotoPress: () => void;
  onRemovePhotoPress: () => void;
  showRemovePhoto: boolean;
  onSave: () => void;
  isSaving: boolean;
};

export function ProfileEditModal({
  visible,
  onClose,
  topInset,
  editingName,
  setEditingName,
  editingPhone,
  setEditingPhone,
  editingAddress,
  setEditingAddress,
  photoPreviewUri,
  onChangePhotoPress,
  onRemovePhotoPress,
  showRemovePhoto,
  onSave,
  isSaving,
}: ProfileEditModalProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? topInset + 8 : 0}
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

        <ScrollView
          className="flex-1 px-6 pt-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
            Profile photo
          </Text>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                overflow: "hidden",
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {photoPreviewUri ? (
                <ExpoImage
                  source={{ uri: photoPreviewUri }}
                  style={{ width: 96, height: 96 }}
                  contentFit="cover"
                />
              ) : (
                <Ionicons name="person" size={40} color={theme.secondary} />
              )}
            </View>
            <TouchableOpacity
              onPress={onChangePhotoPress}
              disabled={isSaving}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: theme.primary, fontWeight: "600" }}>
                Change photo
              </Text>
            </TouchableOpacity>
            {showRemovePhoto ? (
              <TouchableOpacity
                onPress={onRemovePhotoPress}
                disabled={isSaving}
                style={{ marginTop: 8 }}
              >
                <Text style={{ color: theme.secondary, fontSize: 13 }}>Remove photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
            Name
          </Text>
          <TextInput
            className="rounded-xl py-4 px-4 text-base mb-1"
            style={{
              backgroundColor: theme.card,
              color: theme.foreground,
              borderColor: theme.border,
              borderWidth: 1,
            }}
            value={editingName}
            onChangeText={setEditingName}
            placeholder="Your name"
            placeholderTextColor={theme.secondary}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!isSaving}
          />
          <Text className="text-xs mb-4" style={{ color: theme.secondary }}>
            Used in greetings and on pet documents. Works for Apple, Google, and email sign-in.
          </Text>
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
