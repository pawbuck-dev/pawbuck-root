import AnimalTypePicker from "@/components/AnimalTypePicker";
import BreedPicker from "@/components/BreedPicker";
import GenderPicker from "@/components/GenderPicker";
import { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { TablesUpdate } from "@/database.types";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
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

interface PetEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (petId: string, petData: TablesUpdate<"pets">) => Promise<void>;
  pet: Pet;
  loading?: boolean;
}

export const PetEditModal: React.FC<PetEditModalProps> = ({
  visible,
  onClose,
  onSave,
  pet,
  loading = false,
}) => {
  const { theme } = useTheme();
  const [name, setName] = useState(pet.name);
  const [animalType, setAnimalType] = useState(pet.animal_type);
  const [breed, setBreed] = useState(pet.breed);
  const [dateOfBirth, setDateOfBirth] = useState(pet.date_of_birth);
  const [sex, setSex] = useState(pet.sex);
  const [microchipNumber, setMicrochipNumber] = useState(pet.microchip_number || "");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(pet.date_of_birth);
  const [saving, setSaving] = useState(false);
  const [showAnimalTypePicker, setShowAnimalTypePicker] = useState(false);
  const [showBreedPicker, setShowBreedPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const handleSave = async () => {
    // Validate required fields
    if (!name.trim()) {
      Alert.alert("Required Field", "Please enter the pet's name");
      return;
    }
    if (!animalType) {
      Alert.alert("Required Field", "Please select the animal type");
      return;
    }
    if (!breed.trim()) {
      Alert.alert("Required Field", "Please enter the breed");
      return;
    }
    if (!dateOfBirth) {
      Alert.alert("Required Field", "Please select the date of birth");
      return;
    }
    if (!sex) {
      Alert.alert("Required Field", "Please select the gender");
      return;
    }

    const updateData: TablesUpdate<"pets"> = {
      name,
      animal_type: animalType,
      breed,
      date_of_birth: dateOfBirth,
      sex,
      microchip_number: microchipNumber || null,
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
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Text className="text-base" style={{ color: theme.primary }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text
              className="text-lg font-semibold"
              style={{ color: theme.foreground }}
            >
              Edit Pet
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text
                className="text-base font-semibold"
                style={{ color: saving ? theme.secondary : theme.primary }}
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
              className="w-full rounded-xl py-4 px-5 mb-8 text-start"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Max, Bella"
              placeholderTextColor={theme.secondary}
              editable={!saving}
            />
          </View>

          {/* Animal Type */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Animal Type *
            </Text>
            <TouchableOpacity
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
              onPress={() => setShowAnimalTypePicker(true)}
              disabled={saving}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {animalType === "dog" ? "Dog" : "Cat"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
            </TouchableOpacity>
          </View>

          {/* Breed */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Breed *
            </Text>
            <TouchableOpacity
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
              onPress={() => setShowBreedPicker(true)}
              disabled={saving}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {breed || "Select breed"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
            </TouchableOpacity>
          </View>

          {/* Date of Birth */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Date of Birth *
            </Text>
            <View
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {formatDate(dateOfBirth)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setTempDate(dateOfBirth);
                  setShowDatePicker(true);
                }}
                disabled={saving}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
            {showDatePicker && Platform.OS === "ios" && (
              <Modal
                transparent
                animationType="slide"
                visible={showDatePicker}
              >
                <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                  <View style={{ backgroundColor: theme.background }}>
                    <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowDatePicker(false);
                          setTempDate(dateOfBirth);
                        }}
                      >
                        <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setDateOfBirth(tempDate);
                          setShowDatePicker(false);
                        }}
                      >
                        <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempDate ? new Date(tempDate) : new Date()}
                      mode="date"
                      display="spinner"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          setTempDate(selectedDate.toISOString());
                        }
                      }}
                      textColor={theme.foreground}
                      maximumDate={new Date()}
                    />
                  </View>
                </View>
              </Modal>
            )}
            {showDatePicker && Platform.OS === "android" && (
              <DateTimePicker
                value={dateOfBirth ? new Date(dateOfBirth) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (event.type === "set" && selectedDate) {
                    setDateOfBirth(selectedDate.toISOString());
                  }
                }}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Gender */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Gender *
            </Text>
            <TouchableOpacity
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
              onPress={() => setShowGenderPicker(true)}
              disabled={saving}
            >
              <Text className="text-base capitalize" style={{ color: theme.foreground }}>
                {sex || "Select gender"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
            </TouchableOpacity>
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
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={microchipNumber}
              onChangeText={setMicrochipNumber}
              placeholder="Optional"
              placeholderTextColor={theme.secondary}
              editable={!saving}
            />
          </View>

          <View className="h-20" />
        </ScrollView>

        {/* Loading Overlay */}
        {saving && (
          <View
            className="absolute inset-0 items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          >
            <View
              className="p-6 rounded-2xl items-center"
              style={{ backgroundColor: theme.card }}
            >
              <ActivityIndicator size="large" color={theme.primary} />
              <Text
                className="text-base font-semibold mt-4"
                style={{ color: theme.foreground }}
              >
                Updating Pet...
              </Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Animal Type Picker Modal */}
      {showAnimalTypePicker && (
        <AnimalTypePicker
          visible={showAnimalTypePicker}
          selectedType={(animalType as "dog" | "cat") || "dog"}
          onSelect={(type) => {
            setAnimalType(type);
            setShowAnimalTypePicker(false);
          }}
          onClose={() => setShowAnimalTypePicker(false)}
        />
      )}

      {/* Breed Picker Modal */}
      {showBreedPicker && (
        <BreedPicker
          visible={showBreedPicker}
          petType={animalType as "dog" | "cat"}
          selectedBreed={breed}
          onSelect={(selectedBreed) => {
            setBreed(selectedBreed);
            setShowBreedPicker(false);
          }}
          onClose={() => setShowBreedPicker(false)}
        />
      )}

      {/* Gender Picker Modal */}
      {showGenderPicker && (
        <GenderPicker
          visible={showGenderPicker}
          selectedGender={(sex as "male" | "female") || "male"}
          onSelect={(selectedGender) => {
            setSex(selectedGender);
            setShowGenderPicker(false);
          }}
          onClose={() => setShowGenderPicker(false)}
        />
      )}
    </Modal>
  );
};

