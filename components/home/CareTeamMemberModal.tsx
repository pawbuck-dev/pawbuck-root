import { useTheme } from "@/context/themeContext";
import { TablesInsert, TablesUpdate } from "@/database.types";
import { VetInformation, CareTeamMemberType } from "@/services/vetInformation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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

interface CareTeamMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    memberData: TablesInsert<"vet_information"> | TablesUpdate<"vet_information">
  ) => Promise<void>;
  onDelete?: () => Promise<void>;
  memberInfo?: VetInformation | null;
  memberType: CareTeamMemberType;
  onTypeChange?: (type: CareTeamMemberType) => void;
  petId: string;
  loading?: boolean;
}

const validateEmail = (emailToValidate: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(emailToValidate);
};

const getTypeLabel = (type: CareTeamMemberType): string => {
  const labels: Record<CareTeamMemberType, string> = {
    veterinarian: "Veterinarian",
    dog_walker: "Walker",
    groomer: "Groomer",
    pet_sitter: "Sitter",
    boarding: "Boarder",
  };
  return labels[type];
};

// Type options for dropdown
const TYPE_OPTIONS: { value: CareTeamMemberType; label: string }[] = [
  { value: "veterinarian", label: "Veterinarian" },
  { value: "groomer", label: "Groomer" },
  { value: "dog_walker", label: "Walker" },
  { value: "pet_sitter", label: "Sitter" },
  { value: "boarding", label: "Boarder" },
];

const getTypeIcon = (type: CareTeamMemberType): keyof typeof Ionicons.glyphMap => {
  const icons: Record<CareTeamMemberType, keyof typeof Ionicons.glyphMap> = {
    veterinarian: "medical-outline",
    dog_walker: "walk-outline",
    groomer: "cut-outline",
    pet_sitter: "home-outline",
    boarding: "business-outline",
  };
  return icons[type];
};

const getBusinessNameLabel = (type: CareTeamMemberType): string => {
  const labels: Record<CareTeamMemberType, string> = {
    veterinarian: "Clinic Name",
    dog_walker: "Business Name",
    groomer: "Salon Name",
    pet_sitter: "Business Name",
    boarding: "Facility Name",
  };
  return labels[type];
};

const getPersonNameLabel = (type: CareTeamMemberType): string => {
  const labels: Record<CareTeamMemberType, string> = {
    veterinarian: "Veterinarian Name",
    dog_walker: "Walker Name",
    groomer: "Groomer Name",
    pet_sitter: "Sitter Name",
    boarding: "Contact Name",
  };
  return labels[type];
};

export const CareTeamMemberModal: React.FC<CareTeamMemberModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  memberInfo,
  memberType,
  petId,
  loading = false,
}) => {
  const { theme } = useTheme();
  const isEditing = !!memberInfo;
  const [currentMemberType, setCurrentMemberType] = useState<CareTeamMemberType>(memberType);

  // Form state
  const [businessName, setBusinessName] = useState(memberInfo?.clinic_name || "");
  const [personName, setPersonName] = useState(memberInfo?.vet_name || "");
  const [address, setAddress] = useState(memberInfo?.address || "");
  const [phone, setPhone] = useState(memberInfo?.phone || "");
  const [email, setEmail] = useState(memberInfo?.email || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Reset form when modal opens or memberInfo changes
  useEffect(() => {
    if (visible) {
      setBusinessName(memberInfo?.clinic_name || "");
      setPersonName(memberInfo?.vet_name || "");
      setAddress(memberInfo?.address || "");
      setPhone(memberInfo?.phone || "");
      setEmail(memberInfo?.email || "");
      setCurrentMemberType(memberType);
    }
  }, [visible, memberInfo, memberType]);

  const handleSave = async () => {
    // Validate required fields
    if (!personName.trim()) {
      Alert.alert("Required Field", "Please enter the name");
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

    const memberData = {
      clinic_name: businessName.trim() || "",
      vet_name: personName.trim(),
      address: address.trim() || "",
      phone: phone.trim() || "",
      email: email.trim().toLowerCase(),
      type: currentMemberType,
    };

    setSaving(true);
    try {
      await onSave(memberData);
      onClose();
    } catch (error) {
      Alert.alert("Error", `Failed to save ${getTypeLabel(currentMemberType).toLowerCase()} information`);
      console.error("Error saving care team member:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;

    Alert.alert(
      `Remove ${getTypeLabel(currentMemberType)}`,
      `Are you sure you want to remove this ${getTypeLabel(currentMemberType).toLowerCase()}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await onDelete();
              onClose();
            } catch (error) {
              Alert.alert("Error", `Failed to remove ${getTypeLabel(currentMemberType).toLowerCase()}`);
              console.error("Error deleting care team member:", error);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const typeLabel = getTypeLabel(currentMemberType);
  const typeIcon = getTypeIcon(currentMemberType);
  const businessLabel = getBusinessNameLabel(currentMemberType);
  const personLabel = getPersonNameLabel(currentMemberType);

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
            borderBottomColor: theme.border,
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
              {isEditing ? `Edit ${typeLabel}` : "Add Care Team Member"}
            </Text>
            <TouchableOpacity onPress={onClose} disabled={saving || deleting}>
              <Ionicons name="close" size={24} color={theme.foreground} />
            </TouchableOpacity>
          </View>
          {!isEditing && (
            <Text className="text-sm mt-2 text-center" style={{ color: theme.secondary }}>
              Add a new contact to your care team. They will be automatically whitelisted for messaging.
            </Text>
          )}
        </View>

        <ScrollView
          className="flex-1 px-6 pt-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Name *
            </Text>
            <TextInput
              className="rounded-xl py-4 px-4 text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
                borderColor: theme.primary,
                borderWidth: 1,
                textAlignVertical: "center",
              }}
              value={personName}
              onChangeText={setPersonName}
              placeholder="Dr. Jane Smith"
              placeholderTextColor={theme.secondary}
            />
          </View>

          {/* Email */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Email *
            </Text>
            <TextInput
              className="rounded-xl py-4 px-4 text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
                borderColor: theme.primary,
                borderWidth: 1,
                textAlignVertical: "center",
              }}
              value={email}
              onChangeText={setEmail}
              placeholder="jane@example.com"
              placeholderTextColor={theme.secondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Phone */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Phone
            </Text>
            <TextInput
              className="rounded-xl py-4 px-4 text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
                borderColor: theme.primary,
                borderWidth: 1,
                textAlignVertical: "center",
              }}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={theme.secondary}
              keyboardType="phone-pad"
            />
          </View>

          {/* Business Name */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Business Name
            </Text>
            <TextInput
              className="rounded-xl py-4 px-4 text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
                borderColor: theme.primary,
                borderWidth: 1,
                textAlignVertical: "center",
              }}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Happy Paws Clinic"
              placeholderTextColor={theme.secondary}
            />
          </View>

          {/* Type Dropdown */}
          <View className="mb-6">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Type
            </Text>
            <TouchableOpacity
              className="rounded-xl py-4 px-4 flex-row items-center justify-between"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.primary,
                borderWidth: 1,
              }}
              disabled={isEditing}
              onPress={() => setShowTypePicker(true)}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {typeLabel}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.secondary} />
            </TouchableOpacity>
          </View>

          {/* Delete Button */}
          {isEditing && onDelete && (
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting}
              className="py-4 rounded-xl items-center mb-6"
              style={{
                backgroundColor: theme.error + "20",
                borderWidth: 1,
                borderColor: theme.error,
              }}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={theme.error} />
              ) : (
                <Text className="text-base font-semibold" style={{ color: theme.error }}>
                  Remove {typeLabel}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Type Picker Modal */}
        <Modal
          visible={showTypePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTypePicker(false)}
        >
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setShowTypePicker(false)}
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          >
            <View className="flex-1 justify-center px-4">
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <View
                  className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: theme.card }}
                >
                  {TYPE_OPTIONS.map((option) => {
                    const isSelected = currentMemberType === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => {
                          setCurrentMemberType(option.value);
                          setShowTypePicker(false);
                        }}
                        className="flex-row items-center px-6 py-4"
                        style={{
                          backgroundColor: isSelected ? theme.primary : "transparent",
                        }}
                        activeOpacity={0.7}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={20} color="#fff" style={{ marginRight: 12 }} />
                        )}
                        <Text
                          className="text-base flex-1"
                          style={{
                            color: isSelected ? "#fff" : theme.foreground,
                            marginLeft: isSelected ? 0 : 32, // Align text when no checkmark
                          }}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Action Buttons */}
        <View
          className="px-6 pb-6 pt-4 border-t flex-row gap-3"
          style={{
            backgroundColor: theme.card,
            borderTopColor: theme.border,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            disabled={saving || deleting}
            className="flex-1 py-4 rounded-xl items-center"
            style={{
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text className="text-base font-semibold" style={{ color: theme.foreground }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || deleting}
            className="flex-1 py-4 rounded-xl items-center"
            style={{
              backgroundColor: saving || deleting ? theme.border : theme.primary,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-base font-semibold" style={{ color: "#fff" }}>
                Add Contact
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

