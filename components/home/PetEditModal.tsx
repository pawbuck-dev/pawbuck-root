import { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { TablesUpdate } from "@/database.types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const EMAIL_DOMAIN = "@pawbuck.app";

// Country list for inline picker
interface Country {
  name: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { name: "United States", flag: "🇺🇸" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "United Kingdom", flag: "🇬🇧" },
];

interface PetEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (petId: string, petData: TablesUpdate<"pets">) => Promise<void>;
  onDelete: (petId: string) => Promise<void>;
  pet: Pet;
  loading?: boolean;
  deleting?: boolean;
}

export const PetEditModal: React.FC<PetEditModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  pet,
  loading = false,
  deleting = false,
}) => {
  const { theme, mode } = useTheme();
  const [name, setName] = useState(pet.name);
  const [microchipNumber, setMicrochipNumber] = useState(pet.microchip_number || "");
  const [saving, setSaving] = useState(false);
  
  // New editable fields
  const [country, setCountry] = useState(pet.country);
  const [weightValue, setWeightValue] = useState(pet.weight_value?.toString() || "");
  const [weightUnit, setWeightUnit] = useState(pet.weight_unit || "kg");
  const [color, setColor] = useState((pet as any).color || "");
  
  // Inline country picker state
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearchQuery.toLowerCase().trim())
  );

  const handleSave = async () => {
    // Validate required fields
    if (!name.trim()) {
      Alert.alert("Required Field", "Please enter the pet's name");
      return;
    }
    if (!country) {
      Alert.alert("Required Field", "Please select a country");
      return;
    }
    if (!weightValue || isNaN(parseFloat(weightValue)) || parseFloat(weightValue) <= 0) {
      Alert.alert("Required Field", "Please enter a valid weight");
      return;
    }
    if (microchipNumber && microchipNumber.trim().length > 15) {
      Alert.alert("Invalid Input", "Microchip number must be 15 characters or less");
      return;
    }

    const updateData: TablesUpdate<"pets"> & { color?: string | null } = {
      name,
      country,
      weight_value: parseFloat(weightValue),
      weight_unit: weightUnit,
      microchip_number: microchipNumber || null,
      color: color.trim() || null,
    };

    setSaving(true);
    try {
      await onSave(pet.id, updateData);
      Alert.alert("Success", "Pet information updated successfully");
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to update pet information");
      console.error("Error updating pet:", error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Pet",
      `Are you sure you want to delete ${pet.name}? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await onDelete(pet.id);
              onClose();
            } catch (error) {
              Alert.alert("Error", "Failed to delete pet. Please try again.");
              console.error("Error deleting pet:", error);
            }
          },
        },
      ]
    );
  };

  const handleCountrySelect = (selectedCountry: string) => {
    setCountry(selectedCountry);
    setShowCountryPicker(false);
    setCountrySearchQuery("");
  };

  // Inline Country Picker View
  const renderCountryPicker = () => (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* Header */}
      <View
        className="px-6 pt-4 pb-4 border-b"
        style={{
          backgroundColor: theme.card,
          borderBottomColor: theme.background,
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => {
            setShowCountryPicker(false);
            setCountrySearchQuery("");
          }}>
            <View className="flex-row items-center">
              <Ionicons name="chevron-back" size={20} color={theme.primary} />
              <Text className="text-base" style={{ color: theme.primary }}>
                Back
              </Text>
            </View>
          </TouchableOpacity>
          <Text
            className="text-lg font-semibold"
            style={{ color: theme.foreground }}
          >
            Select Country
          </Text>
          <View style={{ width: 60 }} />
        </View>
      </View>

      {/* Search Input */}
      <View className="px-6 py-4">
        <View
          className="flex-row items-center rounded-xl px-4 py-3"
          style={{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons
            name="search"
            size={20}
            color={mode === "dark" ? "#9CA3AF" : "#6B7280"}
          />
          <TextInput
            className="flex-1 ml-2 text-start"
            style={{ color: theme.foreground }}
            placeholder="Search countries..."
            placeholderTextColor={mode === "dark" ? "#6B7280" : "#9CA3AF"}
            value={countrySearchQuery}
            onChangeText={setCountrySearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {countrySearchQuery.length > 0 && (
            <Pressable onPress={() => setCountrySearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={mode === "dark" ? "#6B7280" : "#9CA3AF"}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Countries List */}
      <ScrollView
        className="flex-1 px-6"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        {filteredCountries.length > 0 ? (
          filteredCountries.map((c) => {
            const isSelected = country === c.name;
            return (
              <Pressable
                key={c.name}
                onPress={() => handleCountrySelect(c.name)}
                className="rounded-xl py-4 px-4 mb-2 active:opacity-70"
                style={{
                  backgroundColor: isSelected ? theme.primary : theme.card,
                }}
              >
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-3">{c.flag}</Text>
                  <Text
                    className="text-lg font-medium"
                    style={{
                      color: isSelected ? theme.primaryForeground : theme.foreground,
                    }}
                  >
                    {c.name}
                  </Text>
                  {isSelected && (
                    <View className="ml-auto">
                      <Ionicons name="checkmark" size={24} color={theme.primaryForeground} />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
        ) : (
          <View className="py-8 items-center">
            <Text
              className="text-start"
              style={{ color: theme.foreground, opacity: 0.5 }}
            >
              No countries found
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  // Main Edit Form View
  const renderEditForm = () => (
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
            {pet.name}'s Profile
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
      >
        {/* Pet Name */}
        <View className="mb-4">
          <Text
            className="text-sm font-medium mb-2"
            style={{ color: theme.secondary }}
          >
            Pet Name *
          </Text>
          <TextInput
            className="w-full rounded-xl py-4 px-4 text-start"
            style={{
              backgroundColor: theme.card,
              color: theme.foreground,
            }}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Max, Bella"
            placeholderTextColor={theme.secondary}
            editable={!saving && !deleting}
          />
        </View>

        {/* Email ID (Read-only) */}
        <View className="mb-4">
          <Text
            className="text-sm font-medium mb-2"
            style={{ color: theme.secondary }}
          >
            Email ID
          </Text>
          <View
            className="rounded-xl flex-row items-center"
            style={{
              backgroundColor: theme.card,
              opacity: 0.7,
            }}
          >
            <TextInput
              className="flex-1 py-4 px-4 text-start"
              style={{
                color: theme.secondary,
              }}
              value={pet.email_id || ""}
              editable={false}
            />
            <Text
              className="pr-4"
              style={{ color: theme.secondary }}
            >
              {EMAIL_DOMAIN}
            </Text>
          </View>
          <Text className="text-xs mt-1" style={{ color: theme.secondary }}>
            Email ID cannot be changed after creation
          </Text>
        </View>

        {/* Country (Editable) */}
        <View className="mb-4">
          <Text
            className="text-sm font-medium mb-2"
            style={{ color: theme.secondary }}
          >
            Country *
          </Text>
          <TouchableOpacity
            className="p-4 rounded-xl flex-row items-center justify-between"
            style={{ backgroundColor: theme.card }}
            onPress={() => setShowCountryPicker(true)}
            disabled={saving || deleting}
          >
            <Text className="text-base" style={{ color: theme.foreground }}>
              {country || "Select country"}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </TouchableOpacity>
        </View>

        {/* Color (Editable) */}
        <View className="mb-4">
          <Text
            className="text-sm font-medium mb-2"
            style={{ color: theme.secondary }}
          >
            Color
          </Text>
          <TextInput
            className="w-full rounded-xl py-4 px-4 text-start"
            style={{
              backgroundColor: theme.card,
              color: theme.foreground,
            }}
            value={color}
            onChangeText={setColor}
            placeholder="e.g., Golden, Black, Brown"
            placeholderTextColor={theme.secondary}
            editable={!saving && !deleting}
          />
        </View>

        {/* Weight (Editable) */}
        <View className="mb-4">
          <Text
            className="text-sm font-medium mb-2"
            style={{ color: theme.secondary }}
          >
            Weight *
          </Text>
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 rounded-xl py-4 px-4 text-start"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
                textAlignVertical: "center",
              }}
              value={weightValue}
              onChangeText={setWeightValue}
              placeholder="e.g., 10"
              placeholderTextColor={theme.secondary}
              keyboardType="decimal-pad"
              editable={!saving && !deleting}
            />
            <View className="flex-row rounded-xl overflow-hidden">
              <TouchableOpacity
                className="px-4 py-4 items-center justify-center"
                style={{
                  backgroundColor: weightUnit === "kg" ? theme.primary : theme.card,
                }}
                onPress={() => setWeightUnit("kg")}
                disabled={saving || deleting}
              >
                <Text
                  className="text-base font-medium"
                  style={{
                    color: weightUnit === "kg" ? theme.primaryForeground : theme.foreground,
                  }}
                >
                  kg
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-4 items-center justify-center"
                style={{
                  backgroundColor: weightUnit === "lbs" ? theme.primary : theme.card,
                }}
                onPress={() => setWeightUnit("lbs")}
                disabled={saving || deleting}
              >
                <Text
                  className="text-base font-medium"
                  style={{
                    color: weightUnit === "lbs" ? theme.primaryForeground : theme.foreground,
                  }}
                >
                  lbs
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Animal Type (Read-only) */}
        <View className="mb-4">
          <Text
            className="text-sm font-medium mb-2"
            style={{ color: theme.secondary }}
          >
            Animal Type
          </Text>
          <View
            className="p-4 rounded-xl flex-row items-center justify-between"
            style={{ backgroundColor: theme.card, opacity: 0.7 }}
          >
            <Text className="text-base" style={{ color: theme.secondary }}>
              {pet.animal_type === "dog" ? "Dog" : "Cat"}
            </Text>
          </View>
          <Text className="text-xs mt-1" style={{ color: theme.secondary }}>
            Cannot be changed after creation
          </Text>
        </View>

        {/* Breed (Read-only) */}
        <View className="mb-4">
          <Text
            className="text-sm font-medium mb-2"
            style={{ color: theme.secondary }}
          >
            Breed
          </Text>
          <View
            className="p-4 rounded-xl flex-row items-center justify-between"
            style={{ backgroundColor: theme.card, opacity: 0.7 }}
          >
            <Text className="text-base" style={{ color: theme.secondary }}>
              {pet.breed || "Not set"}
            </Text>
          </View>
          <Text className="text-xs mt-1" style={{ color: theme.secondary }}>
            Cannot be changed after creation
          </Text>
        </View>

        {/* Date of Birth (Read-only) */}
        <View className="mb-4">
          <Text
            className="text-sm font-medium mb-2"
            style={{ color: theme.secondary }}
          >
            Date of Birth
          </Text>
          <View
            className="p-4 rounded-xl flex-row items-center justify-between"
            style={{ backgroundColor: theme.card, opacity: 0.7 }}
          >
            <Text className="text-base" style={{ color: theme.secondary }}>
              {formatDate(pet.date_of_birth)}
            </Text>
          </View>
          <Text className="text-xs mt-1" style={{ color: theme.secondary }}>
            Cannot be changed after creation
          </Text>
        </View>

        {/* Gender (Read-only) */}
        <View className="mb-4">
          <Text
            className="text-sm font-medium mb-2"
            style={{ color: theme.secondary }}
          >
            Gender
          </Text>
          <View
            className="p-4 rounded-xl flex-row items-center justify-between"
            style={{ backgroundColor: theme.card, opacity: 0.7 }}
          >
            <Text className="text-base capitalize" style={{ color: theme.secondary }}>
              {pet.sex || "Not set"}
            </Text>
          </View>
          <Text className="text-xs mt-1" style={{ color: theme.secondary }}>
            Cannot be changed after creation
          </Text>
        </View>

        {/* Microchip Number */}
        <View className="mb-6">
          <Text
            className="text-sm font-medium mb-2"
            style={{ color: theme.secondary }}
          >
            Microchip Number
          </Text>
          <TextInput
            className="p-4 rounded-xl"
            style={{
              backgroundColor: theme.card,
              color: theme.foreground,
            }}
            value={microchipNumber}
            onChangeText={setMicrochipNumber}
            placeholder="Optional"
            placeholderTextColor={theme.secondary}
            editable={!saving && !deleting}
            maxLength={15}
          />
        </View>

        {/* Delete Pet Button */}
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
              Delete Pet
            </Text>
          </View>
        </TouchableOpacity>

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
              {deleting ? "Deleting Pet..." : "Updating Pet..."}
            </Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (showCountryPicker) {
          setShowCountryPicker(false);
          setCountrySearchQuery("");
        } else {
          onClose();
        }
      }}
    >
      {showCountryPicker ? renderCountryPicker() : renderEditForm()}
    </Modal>
  );
};
