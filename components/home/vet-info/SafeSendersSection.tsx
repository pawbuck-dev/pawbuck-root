import { PetEmailList } from "@/services/petEmailList";
import { Theme } from "@/theme/model";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeSenders, validateEmail } from "./useSafeSenders";

interface SafeSendersSectionProps {
  petId: string;
  theme: Theme;
  /** Whether the parent form is processing (disables interactions) */
  isParentProcessing?: boolean;
}

export const SafeSendersSection: React.FC<SafeSendersSectionProps> = ({
  petId,
  theme,
  isParentProcessing = false,
}) => {
  // Local UI state
  const [newEmail, setNewEmail] = useState("");
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState("");

  // Hook for data & mutations
  const {
    whitelistedEmails,
    isLoading,
    addWhitelistedEmail,
    updateWhitelistedEmail,
    deleteWhitelistedEmail,
    isPending,
    isAdding,
    isUpdating,
  } = useSafeSenders({ petId, enabled: true });

  const isProcessing = isParentProcessing || isPending;

  // Handlers
  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      Alert.alert("Required", "Please enter an email address");
      return;
    }
    if (!validateEmail(newEmail.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }
    addWhitelistedEmail(newEmail.trim());
    setNewEmail("");
    setIsAddingEmail(false);
  };

  const handleUpdateEmail = () => {
    if (!editingEmail.trim()) {
      Alert.alert("Required", "Please enter an email address");
      return;
    }
    if (!validateEmail(editingEmail.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }
    if (editingId) {
      updateWhitelistedEmail(editingId, editingEmail.trim());
      setEditingId(null);
      setEditingEmail("");
    }
  };

  const handleDeleteEmail = (emailItem: PetEmailList) => {
    Alert.alert(
      "Remove Email",
      `Are you sure you want to remove "${emailItem.email_id}" from safe senders?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => deleteWhitelistedEmail(emailItem.id),
        },
      ]
    );
  };

  const startEditing = (emailItem: PetEmailList) => {
    setEditingId(emailItem.id);
    setEditingEmail(emailItem.email_id);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingEmail("");
  };

  const cancelAdding = () => {
    setIsAddingEmail(false);
    setNewEmail("");
  };

  return (
    <View className="mb-6">
      {/* Header with Add New button */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-medium" style={{ color: theme.secondary }}>
          Safe Senders
        </Text>
        <TouchableOpacity
          onPress={() => setIsAddingEmail(true)}
          disabled={isProcessing || isAddingEmail}
        >
          <Text className="text-sm font-medium" style={{ color: theme.primary }}>
            + ADD NEW
          </Text>
        </TouchableOpacity>
      </View>

      {/* Helper text */}
      <Text className="text-xs mb-4" style={{ color: theme.secondary }}>
        Emails added here will be automatically processed by the app.
      </Text>

      {/* Add new email input */}
      {isAddingEmail && (
        <View
          className="flex-row items-center rounded-xl mb-3 px-4 py-3"
          style={{ backgroundColor: theme.card }}
        >
          <Ionicons
            name="mail-outline"
            size={20}
            color={theme.secondary}
            style={{ marginRight: 12 }}
          />
          <TextInput
            className="flex-1"
            style={{ color: theme.foreground }}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="Enter email address"
            placeholderTextColor={theme.secondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          <TouchableOpacity
            onPress={handleAddEmail}
            disabled={isAdding}
            style={{ marginLeft: 8 }}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons name="checkmark" size={24} color={theme.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={cancelAdding}
            disabled={isAdding}
            style={{ marginLeft: 8 }}
          >
            <Ionicons name="close" size={24} color={theme.secondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Loading state */}
      {isLoading && (
        <ActivityIndicator
          size="small"
          color={theme.primary}
          style={{ marginVertical: 12 }}
        />
      )}

      {/* List of whitelisted emails */}
      {whitelistedEmails.map((emailItem) => (
        <View
          key={emailItem.id}
          className="flex-row items-center rounded-xl mb-3 px-4 py-3"
          style={{ backgroundColor: theme.card }}
        >
          <Ionicons
            name="mail-outline"
            size={20}
            color={theme.primary}
            style={{ marginRight: 12 }}
          />
          {editingId === emailItem.id ? (
            <>
              <TextInput
                className="flex-1"
                style={{ color: theme.foreground }}
                value={editingEmail}
                onChangeText={setEditingEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <TouchableOpacity
                onPress={handleUpdateEmail}
                disabled={isUpdating}
                style={{ marginLeft: 8 }}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Ionicons name="checkmark" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={cancelEditing}
                disabled={isUpdating}
                style={{ marginLeft: 8 }}
              >
                <Ionicons name="close" size={24} color={theme.secondary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="flex-1" style={{ color: theme.foreground }}>
                {emailItem.email_id}
              </Text>
              <TouchableOpacity
                onPress={() => startEditing(emailItem)}
                disabled={isProcessing}
                style={{ marginLeft: 8 }}
              >
                <Ionicons name="pencil-outline" size={20} color={theme.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteEmail(emailItem)}
                disabled={isProcessing}
                style={{ marginLeft: 12 }}
              >
                <Ionicons name="trash-outline" size={20} color={theme.secondary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      ))}

      {/* Empty state */}
      {!isLoading && whitelistedEmails.length === 0 && !isAddingEmail && (
        <Text
          className="text-sm text-center py-4"
          style={{ color: theme.secondary }}
        >
          No safe senders yet
        </Text>
      )}
    </View>
  );
};

