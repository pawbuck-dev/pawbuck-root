import { useTheme } from "@/context/themeContext";
import { Tables, TablesInsert, TablesUpdate } from "@/database.types";
import { CareTeamMemberType, VetInformation } from "@/services/vetInformation";
import { Ionicons } from "@expo/vector-icons";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Pet = Tables<"pets">;

export interface CareTeamMemberSaveData {
  memberData: TablesInsert<"vet_information"> | TablesUpdate<"vet_information">;
}

interface CareTeamMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: CareTeamMemberSaveData) => Promise<void>;
  onDelete?: () => Promise<void>;
  memberInfo?: VetInformation | null;
  memberType: CareTeamMemberType;
  onTypeChange?: (type: CareTeamMemberType) => void;
  petId: string;
  allPets: Pet[];
  loading?: boolean;
  initialEmail?: string;
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
    unknown: "Other",
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

const getBusinessNameLabel = (type: CareTeamMemberType): string => {
  const labels: Record<CareTeamMemberType, string> = {
    veterinarian: "Clinic Name",
    dog_walker: "Business Name",
    groomer: "Salon Name",
    pet_sitter: "Business Name",
    boarding: "Facility Name",
    unknown: "Business Name",
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
    unknown: "Contact Name",
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
  allPets,
  loading = false,
  initialEmail,
}) => {
  const { theme, mode } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const isLight = mode === "light";
  const isEditing = !!memberInfo;
  const [currentMemberType, setCurrentMemberType] = useState<CareTeamMemberType>(memberType);

  // Form state
  const [businessName, setBusinessName] = useState(memberInfo?.clinic_name || "");
  const [personName, setPersonName] = useState(memberInfo?.vet_name || "");
  const [address, setAddress] = useState(memberInfo?.address || "");
  const [phone, setPhone] = useState(memberInfo?.phone || "");
  const [email, setEmail] = useState(memberInfo?.email || initialEmail || "");
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
      setEmail(memberInfo?.email || initialEmail || "");
      setCurrentMemberType(memberType);
    }
  }, [visible, memberInfo, memberType, initialEmail]);

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
    if (!isEditing && allPets.length === 0) {
      Alert.alert("Error", "You need to have at least one pet to add a care team member");
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
      await onSave({ memberData });
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
  const businessLabel = getBusinessNameLabel(currentMemberType);
  const personLabel = getPersonNameLabel(currentMemberType);

  const light = {
    pageBg: theme.background,
    title: "#111111",
    subtitle: "#757575",
    label: "#111111",
    inputFill: "#EEF0F2",
    typeSurface: "#FFFFFF",
    backFab: "#E8EAED",
    footerMutedBtn: "#DDE1E5",
    pickerSurface: "#FFFFFF",
    pickerRowSelected: "#F0F2F4",
    pickerDivider: "#ECECEC",
  };

  const labelStyle = isLight
    ? {
        fontFamily: "Poppins_600SemiBold" as const,
        fontSize: 15,
        color: light.label,
        marginBottom: 8,
      }
    : {
        fontSize: 14,
        fontWeight: "500" as const,
        color: theme.secondary,
        marginBottom: 8,
      };

  const filledInputStyle = isLight
    ? {
        backgroundColor: light.inputFill,
        color: light.title,
        borderWidth: 0,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        textAlignVertical: "center" as const,
      }
    : {
        backgroundColor: theme.card,
        color: theme.foreground,
        borderColor: theme.primary,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        textAlignVertical: "center" as const,
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
        style={{
          backgroundColor: isLight ? light.pageBg : theme.background,
          paddingTop: Platform.OS === "android" ? top : 0,
          paddingBottom: Platform.OS === "android" ? bottom : 0,
        }}
      >
        {/* Header */}
        {isLight ? (
          <View style={{ paddingHorizontal: 24, paddingTop: top + 8, paddingBottom: 20 }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={saving || deleting}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: light.backFab,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={22} color={light.title} />
            </TouchableOpacity>
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 22,
                lineHeight: 28,
                color: light.title,
              }}
            >
              {isEditing ? `Edit ${typeLabel}` : "Add Care Team Member"}
            </Text>
            {!isEditing && (
              <Text
                style={{
                  fontFamily: "Poppins_400Regular",
                  fontSize: 14,
                  lineHeight: 20,
                  color: light.subtitle,
                  marginTop: 8,
                }}
              >
                Add a new contact to your care team. They will be automatically whitelisted for messaging.
              </Text>
            )}
          </View>
        ) : (
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
              <Text className="text-lg font-semibold" style={{ color: theme.foreground }}>
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
        )}

        <ScrollView
          className="flex-1 px-6 pt-2"
          style={{ backgroundColor: isLight ? light.pageBg : undefined }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Type Dropdown */}
          <View style={{ marginBottom: 22 }}>
            <Text style={labelStyle}>Type</Text>
            <TouchableOpacity
              className="flex-row items-center justify-between"
              style={{
                backgroundColor: isLight ? light.typeSurface : theme.card,
                borderColor: theme.primary,
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
              disabled={isEditing}
              onPress={() => setShowTypePicker(true)}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: isLight ? light.title : theme.foreground,
                  fontFamily: isLight ? "Poppins_400Regular" : undefined,
                }}
              >
                {typeLabel}
              </Text>
              <Ionicons
                name={showTypePicker ? "chevron-up" : "chevron-down"}
                size={20}
                color={isLight ? light.title : theme.secondary}
              />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <View style={{ marginBottom: 18 }}>
            <Text style={labelStyle}>{personLabel} *</Text>
            <TextInput
              style={filledInputStyle}
              value={personName}
              onChangeText={setPersonName}
              placeholder="Dr. Jane Smith"
              placeholderTextColor={isLight ? "#9CA3AF" : theme.secondary}
            />
          </View>

          {/* Email */}
          <View style={{ marginBottom: 18 }}>
            <Text style={labelStyle}>Email *</Text>
            <TextInput
              style={filledInputStyle}
              value={email}
              onChangeText={setEmail}
              placeholder="jane@example.com"
              placeholderTextColor={isLight ? "#9CA3AF" : theme.secondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Phone */}
          <View style={{ marginBottom: 18 }}>
            <Text style={labelStyle}>Phone</Text>
            <TextInput
              style={filledInputStyle}
              value={phone}
              onChangeText={setPhone}
              placeholder={isLight ? "(000) 123-4567" : "+1 (555) 123-4567"}
              placeholderTextColor={isLight ? "#9CA3AF" : theme.secondary}
              keyboardType="phone-pad"
            />
          </View>

          {/* Business Name */}
          <View style={{ marginBottom: 18 }}>
            <Text style={labelStyle}>{businessLabel}</Text>
            <TextInput
              style={filledInputStyle}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder={isLight ? "e.g., Happy Paws Clinic" : "Happy Paws Clinic"}
              placeholderTextColor={isLight ? "#9CA3AF" : theme.secondary}
            />
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
            style={{ backgroundColor: isLight ? "rgba(0, 0, 0, 0.35)" : "rgba(0, 0, 0, 0.5)" }}
          >
            <View className="flex-1 justify-center px-4">
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <View
                  className="overflow-hidden"
                  style={
                    isLight
                      ? {
                          backgroundColor: light.pickerSurface,
                          borderRadius: 16,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: 0.12,
                          shadowRadius: 24,
                          elevation: 8,
                        }
                      : { backgroundColor: theme.card, borderRadius: 16 }
                  }
                >
                  {TYPE_OPTIONS.map((option, index) => {
                    const isSelected = currentMemberType === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => {
                          setCurrentMemberType(option.value);
                          setShowTypePicker(false);
                        }}
                        className="flex-row items-center justify-between"
                        style={
                          isLight
                            ? {
                                paddingHorizontal: 18,
                                paddingVertical: 16,
                                backgroundColor: isSelected ? light.pickerRowSelected : "transparent",
                                borderBottomWidth: index < TYPE_OPTIONS.length - 1 ? 1 : 0,
                                borderBottomColor: light.pickerDivider,
                              }
                            : {
                                paddingHorizontal: 24,
                                paddingVertical: 16,
                                backgroundColor: isSelected ? theme.primary : "transparent",
                              }
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontFamily: isLight ? "Poppins_500Medium" : undefined,
                            color: isLight
                              ? light.title
                              : isSelected
                                ? "#fff"
                                : theme.foreground,
                            flex: 1,
                          }}
                        >
                          {option.label}
                        </Text>
                        {isSelected &&
                          (isLight ? (
                            <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                          ) : (
                            <Ionicons name="checkmark" size={20} color="#fff" />
                          ))}
                        {!isSelected && !isLight && <View style={{ width: 20 }} />}
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
          className="px-6 flex-row"
          style={{
            gap: 12,
            paddingTop: 12,
            paddingBottom: Math.max(bottom, 16) + 8,
            backgroundColor: isLight ? light.pageBg : theme.card,
            borderTopWidth: isLight ? 0 : 1,
            borderTopColor: theme.border,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            disabled={saving || deleting}
            className="flex-1 items-center justify-center"
            style={{
              paddingVertical: 14,
              borderRadius: 100,
              backgroundColor: isLight ? "#FFFFFF" : "transparent",
              borderWidth: 1,
              borderColor: isLight ? "#D8DCDE" : theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: isLight ? "Poppins_600SemiBold" : undefined,
                fontWeight: isLight ? undefined : "600",
                color: isLight ? light.title : theme.foreground,
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || deleting}
            className="flex-1 items-center justify-center"
            style={{
              paddingVertical: 14,
              borderRadius: 100,
              backgroundColor: isLight
                ? saving || deleting
                  ? "#C8CCD1"
                  : light.footerMutedBtn
                : saving || deleting
                  ? theme.border
                  : theme.primary,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={isLight ? light.title : "#fff"} />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: isLight ? "Poppins_600SemiBold" : undefined,
                  fontWeight: isLight ? undefined : "600",
                  color: isLight ? light.title : "#fff",
                }}
              >
                {isEditing ? "Save" : "Add Contact"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

