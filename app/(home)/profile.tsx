import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { getUserProfile, updateUserProfile } from "@/services/userProfile";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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

export default function Profile() {
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPhone, setEditingPhone] = useState("");
  const [editingAddress, setEditingAddress] = useState("");

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["user_profile"],
    queryFn: getUserProfile,
    enabled: !!user,
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_profile"] });
      queryClient.invalidateQueries({ queryKey: ["user_preferences"] });
      setShowEditModal(false);
      Alert.alert("Success", "Profile updated successfully");
    },
    onError: (error) => {
      Alert.alert("Error", "Failed to update profile");
      console.error("Error updating profile:", error);
    },
  });

  const handleEdit = () => {
    if (profile) {
      setEditingPhone(profile.phone || "");
      setEditingAddress(profile.address || "");
      setShowEditModal(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate({
      phone: editingPhone.trim() || null,
      address: editingAddress.trim() || null,
    });
  };

  const InformationRow = ({
    icon,
    label,
    value,
    locked = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    locked?: boolean;
  }) => (
    <View
      className="flex-row items-center justify-between py-4"
      style={{
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
      }}
    >
      <View className="flex-row items-center flex-1">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: `${theme.primary}20` }}
        >
          <Ionicons name={icon} size={20} color={theme.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-sm" style={{ color: theme.secondary }}>
            {label}
          </Text>
          <Text className="text-base font-semibold mt-0.5" style={{ color: theme.foreground }}>
            {value || "Not set"}
          </Text>
        </View>
      </View>
      {locked && (
        <View
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }}
        >
          <Text className="text-xs" style={{ color: theme.secondary }}>
            Locked
          </Text>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  // Extract name from user metadata or email
  const displayName = profile.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* Header */}
      <View className="pt-12 pb-4 px-6">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center mr-4"
            style={{ backgroundColor: theme.card }}
          >
            <Ionicons name="chevron-back" size={20} color={theme.foreground} />
          </TouchableOpacity>
          <Text
            className="text-2xl font-bold flex-1"
            style={{ color: theme.foreground }}
          >
            User Profile
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Profile Avatar Section */}
        <View className="items-center py-6">
          <View
            className="w-32 h-32 rounded-3xl items-center justify-center mb-4"
            style={{ backgroundColor: theme.card }}
          >
            <Ionicons name="person-outline" size={64} color={theme.primary} />
          </View>
          <Text
            className="text-2xl font-bold"
            style={{ color: theme.foreground }}
          >
            {displayName}
          </Text>
        </View>

        {/* Account Details Card */}
        <View className="px-4">
          <LinearGradient
            colors={isDarkMode 
              ? ["rgba(28, 33, 40, 0.8)", "rgba(28, 33, 40, 0.4)"]
              : ["#FFFFFF", "#F8FAFA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              padding: 20,
              borderWidth: isDarkMode ? 1 : 0,
              borderColor: theme.border,
              // Shadow for iOS - matches Tailwind shadow-lg
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.1,
              shadowRadius: 15,
              // Shadow for Android
              elevation: 10,
            }}
          >
            {/* Card Header with Edit Button */}
            <View className="flex-row items-center justify-between mb-4">
              <Text
                className="text-lg font-bold"
                style={{ color: theme.foreground }}
              >
                Account Details
              </Text>
              <TouchableOpacity
                onPress={handleEdit}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: `${theme.primary}20` }}
              >
                <Ionicons name="pencil-outline" size={18} color={theme.primary} />
              </TouchableOpacity>
            </View>

            {/* Name */}
            <InformationRow
              icon="person-outline"
              label="Name"
              value={displayName}
              locked={true}
            />

            {/* Email */}
            <InformationRow
              icon="mail-outline"
              label="Email"
              value={profile.email}
            />

            {/* Phone */}
            <InformationRow
              icon="call-outline"
              label="Phone"
              value={profile.phone || "Not set"}
            />

            {/* Address */}
            <View className="flex-row items-start justify-between py-4">
              <View className="flex-row items-start flex-1">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: `${theme.primary}20` }}
                >
                  <Ionicons name="location-outline" size={20} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm" style={{ color: theme.secondary }}>
                    Address
                  </Text>
                  <Text className="text-base font-medium mt-0.5" style={{ color: theme.foreground }}>
                    {profile.address || "Not set"}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
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
              borderBottomColor: theme.border,
            }}
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                disabled={updateMutation.isPending}
              >
                <Text className="text-base" style={{ color: theme.primary }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text
                className="text-lg font-semibold"
                style={{ color: theme.foreground }}
              >
                Edit Profile
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={updateMutation.isPending}
              >
                <Text
                  className="text-base font-semibold"
                  style={{
                    color: updateMutation.isPending ? theme.secondary : theme.primary,
                  }}
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
            {/* Phone */}
            <View className="mb-4">
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: theme.secondary }}
              >
                Phone Number
              </Text>
              <TextInput
                className="rounded-xl py-4 px-4 text-base"
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
            </View>

            {/* Address */}
            <View className="mb-6">
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: theme.secondary }}
              >
                Address
              </Text>
              <TextInput
                className="rounded-xl py-4 px-4 text-base"
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
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

