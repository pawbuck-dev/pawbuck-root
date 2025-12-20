import { useTheme } from "@/context/themeContext";
import { TablesInsert, TablesUpdate } from "@/database.types";
import { VetInformation } from "@/services/vetInformation";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface VetInfoModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (vetData: TablesInsert<"vet_information"> | TablesUpdate<"vet_information">) => Promise<void>;
  onDelete?: () => Promise<void>;
  vetInfo?: VetInformation | null;
  loading?: boolean;
}

export const VetInfoModal: React.FC<VetInfoModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  vetInfo,
  loading = false,
}) => {
  const { theme } = useTheme();
  const isEditing = !!vetInfo;

  const [clinicName, setClinicName] = useState(vetInfo?.clinic_name || "");
  const [vetName, setVetName] = useState(vetInfo?.vet_name || "");
  const [address, setAddress] = useState(vetInfo?.address || "");
  const [phone, setPhone] = useState(vetInfo?.phone || "");
  const [email, setEmail] = useState(vetInfo?.email || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    // Validate required fields
    if (!clinicName.trim()) {
      Alert.alert("Required Field", "Please enter the clinic name");
      return;
    }
    if (!vetName.trim()) {
      Alert.alert("Required Field", "Please enter the vet's name");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Required Field", "Please enter the address");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Required Field", "Please enter the phone number");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Required Field", "Please enter the email address");
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    const vetData = {
      clinic_name: clinicName.trim(),
      vet_name: vetName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
    };

    setSaving(true);
    try {
      await onSave(vetData);
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to save vet information");
      console.error("Error saving vet info:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;

    Alert.alert(
      "Remove Vet Information",
      "Are you sure you want to remove this veterinary information?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await onDelete();
              onClose();
            } catch (error) {
              Alert.alert("Error", "Failed to remove vet information");
              console.error("Error deleting vet info:", error);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ backgroundColor: theme.background }}
      >
        {/* Header */}
        <View
          className="px-6 pt-4 pb-4 border-b"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.background,
          }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose} disabled={saving || deleting}>
              <Text className="text-base" style={{ color: theme.primary }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text
              className="text-lg font-semibold"
              style={{ color: theme.foreground }}
            >
              {isEditing ? "Edit Vet Info" : "Add Vet Info"}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving || deleting}>
              <Text
                className="text-base font-semibold"
                style={{ color: saving || deleting ? theme.secondary : theme.primary }}
              >
                {saving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6 pt-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Clinic Name */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Clinic Name *
            </Text>
            <TextInput
              className="w-full rounded-xl py-4 px-4 text-start"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={clinicName}
              onChangeText={setClinicName}
              placeholder="e.g., Happy Paws Veterinary Clinic"
              placeholderTextColor={theme.secondary}
              editable={!saving && !deleting}
              autoCapitalize="words"
            />
          </View>

          {/* Vet Name */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Veterinarian Name *
            </Text>
            <TextInput
              className="w-full rounded-xl py-4 px-4 text-start"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={vetName}
              onChangeText={setVetName}
              placeholder="e.g., Dr. John Smith"
              placeholderTextColor={theme.secondary}
              editable={!saving && !deleting}
              autoCapitalize="words"
            />
          </View>

          {/* Address */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Address *
            </Text>
            <TextInput
              className="w-full rounded-xl py-4 px-4 text-start"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
                minHeight: 80,
              }}
              value={address}
              onChangeText={setAddress}
              placeholder="e.g., 123 Main Street, City, State 12345"
              placeholderTextColor={theme.secondary}
              editable={!saving && !deleting}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Phone */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Phone Number *
            </Text>
            <TextInput
              className="w-full rounded-xl py-4 px-4 text-start"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g., (555) 123-4567"
              placeholderTextColor={theme.secondary}
              editable={!saving && !deleting}
              keyboardType="phone-pad"
            />
          </View>

          {/* Email */}
          <View className="mb-6">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Email *
            </Text>
            <TextInput
              className="w-full rounded-xl py-4 px-4 text-start"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={email}
              onChangeText={setEmail}
              placeholder="e.g., contact@happypaws.com"
              placeholderTextColor={theme.secondary}
              editable={!saving && !deleting}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Delete Button (only when editing) */}
          {isEditing && onDelete && (
            <TouchableOpacity
              className="p-4 rounded-xl items-center mb-6"
              style={{
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: "#EF4444",
              }}
              onPress={handleDelete}
              disabled={saving || deleting}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text
                  className="text-base font-medium"
                  style={{ color: "#EF4444" }}
                >
                  Remove Vet Info
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <View className="h-20" />
        </ScrollView>

        {/* Loading Overlay */}
        {(saving || deleting) && (
          <View
            className="absolute inset-0 items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          >
            <View
              className="p-6 rounded-2xl items-center"
              style={{ backgroundColor: theme.card }}
            >
              <ActivityIndicator size="large" color={deleting ? "#EF4444" : theme.primary} />
              <Text
                className="text-base font-semibold mt-4"
                style={{ color: theme.foreground }}
              >
                {deleting ? "Removing..." : "Saving..."}
              </Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};
