import AnimalTypePicker from "@/components/AnimalTypePicker";
import BreedPicker from "@/components/BreedPicker";
import CountryPicker from "@/components/CountryPicker";
import GenderPicker from "@/components/GenderPicker";
import { COUNTRY_FLAGS } from "@/constants/onboarding";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import DatePicker from "react-native-date-picker";

type EditingField =
  | "country"
  | "petType"
  | "breed"
  | "petName"
  | "gender"
  | "birthDate"
  | "weight"
  | "microchip"
  | null;

export default function OnboardingReview() {
  const router = useRouter();
  const { theme, toggleTheme, mode } = useTheme();
  const { petData, updatePetData, saveToStorage } = useOnboarding();

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showBreedPicker, setShowBreedPicker] = useState(false);
  const [showAnimalTypePicker, setShowAnimalTypePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Temp values for editing
  const [tempPetName, setTempPetName] = useState(petData.petName || "");
  const [tempWeight, setTempWeight] = useState(
    petData.weight?.toString() || ""
  );
  const [tempWeightUnit, setTempWeightUnit] = useState(
    petData.weightUnit || "pounds"
  );
  const [tempMicrochip, setTempMicrochip] = useState(
    petData.microchipNumber || ""
  );
  const [tempBirthDate, setTempBirthDate] = useState(
    petData.birthDate ? new Date(petData.birthDate) : new Date()
  );

  const petName = petData.petName || "your pet";

  const handleConfirm = async () => {
    // Save all data to storage
    await saveToStorage();

    // Navigate to account creation screen
    router.push("/onboarding/complete");
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleSaveField = (field: EditingField) => {
    if (field === "petName") {
      updatePetData({ petName: tempPetName });
    } else if (field === "weight") {
      const weightValue = parseFloat(tempWeight);
      if (!isNaN(weightValue)) {
        updatePetData({ weight: weightValue, weightUnit: tempWeightUnit });
      }
    } else if (field === "microchip") {
      updatePetData({ microchipNumber: tempMicrochip });
    } else if (field === "birthDate") {
      updatePetData({ birthDate: tempBirthDate.toISOString() });
    }
    setEditingField(null);
  };

  const handleCancelEdit = () => {
    // Reset temp values
    setTempPetName(petData.petName || "");
    setTempWeight(petData.weight?.toString() || "");
    setTempWeightUnit(petData.weightUnit || "pounds");
    setTempMicrochip(petData.microchipNumber || "");
    setTempBirthDate(
      petData.birthDate ? new Date(petData.birthDate) : new Date()
    );
    setEditingField(null);
  };

  const ProfileField = ({
    label,
    value,
    field,
    showFlag,
    onPickerOpen,
  }: {
    label: string;
    value: string;
    field: EditingField;
    showFlag?: boolean;
    onPickerOpen?: () => void;
  }) => {
    const isEditing = editingField === field;

    return (
      <View
        className="py-4 border-b"
        style={{ borderBottomColor: theme.border }}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text
              className="text-sm mb-2"
              style={{ color: theme.foreground, opacity: 0.6 }}
            >
              {label}
            </Text>

            {!isEditing ? (
              <View className="flex-row items-center">
                {showFlag &&
                  petData.country &&
                  COUNTRY_FLAGS[petData.country] && (
                    <Text className="text-lg mr-2">
                      {COUNTRY_FLAGS[petData.country]}
                    </Text>
                  )}
                <Text
                  className="text-lg font-semibold"
                  style={{ color: theme.foreground }}
                >
                  {value}
                </Text>
              </View>
            ) : (
              <View>
                {field === "petName" && (
                  <TextInput
                    className="text-lg font-semibold rounded-lg px-3 py-2"
                    style={{
                      color: theme.foreground,
                      backgroundColor: theme.background,
                      borderWidth: 1,
                      borderColor: theme.primary,
                    }}
                    value={tempPetName}
                    onChangeText={setTempPetName}
                    autoFocus
                  />
                )}
                {field === "weight" && (
                  <View>
                    <View className="flex-row gap-2 mb-2">
                      <Pressable
                        onPress={() => setTempWeightUnit("pounds")}
                        className="px-4 py-2 rounded-lg"
                        style={{
                          backgroundColor:
                            tempWeightUnit === "pounds"
                              ? theme.primary
                              : theme.secondary,
                        }}
                      >
                        <Text
                          style={{
                            color:
                              tempWeightUnit === "pounds"
                                ? theme.primaryForeground
                                : theme.foreground,
                          }}
                        >
                          Pounds
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setTempWeightUnit("kilograms")}
                        className="px-4 py-2 rounded-lg"
                        style={{
                          backgroundColor:
                            tempWeightUnit === "kilograms"
                              ? theme.primary
                              : theme.secondary,
                        }}
                      >
                        <Text
                          style={{
                            color:
                              tempWeightUnit === "kilograms"
                                ? theme.primaryForeground
                                : theme.foreground,
                          }}
                        >
                          Kilograms
                        </Text>
                      </Pressable>
                    </View>
                    <TextInput
                      className="text-lg font-semibold rounded-lg px-3 py-2"
                      style={{
                        color: theme.foreground,
                        backgroundColor: theme.background,
                        borderWidth: 1,
                        borderColor: theme.primary,
                      }}
                      value={tempWeight}
                      onChangeText={setTempWeight}
                      keyboardType="decimal-pad"
                      placeholder={`Weight in ${tempWeightUnit}`}
                      placeholderTextColor={
                        mode === "dark" ? "#6B7280" : "#9CA3AF"
                      }
                    />
                  </View>
                )}
                {field === "microchip" && (
                  <TextInput
                    className="text-lg font-semibold rounded-lg px-3 py-2"
                    style={{
                      color: theme.foreground,
                      backgroundColor: theme.background,
                      borderWidth: 1,
                      borderColor: theme.primary,
                    }}
                    value={tempMicrochip}
                    onChangeText={setTempMicrochip}
                    keyboardType="numeric"
                    maxLength={15}
                    placeholder="15-digit number"
                    placeholderTextColor={
                      mode === "dark" ? "#6B7280" : "#9CA3AF"
                    }
                  />
                )}
                <View className="flex-row gap-2 mt-2">
                  <Pressable
                    onPress={() => handleSaveField(field)}
                    className="px-4 py-2 rounded-lg"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <Text style={{ color: theme.primaryForeground }}>Save</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCancelEdit}
                    className="px-4 py-2 rounded-lg"
                    style={{ backgroundColor: theme.secondary }}
                  >
                    <Text style={{ color: theme.foreground }}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {!isEditing && (
            <Pressable
              onPress={() => {
                if (onPickerOpen) {
                  onPickerOpen();
                } else {
                  setEditingField(field);
                }
              }}
              className="w-10 h-10 items-center justify-center active:opacity-70"
            >
              <Ionicons
                name="pencil"
                size={20}
                color={theme.foreground}
                style={{ opacity: 0.5 }}
              />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      {/* Header */}
      <View className="px-6 pt-14 pb-4">
        <View className="flex-row items-center mb-6">
          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center active:opacity-70"
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={theme.foreground}
              style={{ opacity: 0.7 }}
            />
            <Text
              className="text-start ml-1"
              style={{ color: theme.foreground, opacity: 0.7 }}
            >
              Back
            </Text>
          </Pressable>

          <View className="flex-1" />

          {/* Theme Toggle */}
          <Pressable
            onPress={toggleTheme}
            className="w-12 h-12 items-center justify-center active:opacity-70"
          >
            <Ionicons
              name={mode === "dark" ? "sunny" : "moon"}
              size={24}
              color={mode === "dark" ? "#9CA3AF" : "#6B7280"}
            />
          </Pressable>
        </View>

        {/* Success Icon */}
        <View className="items-center mb-6">
          <View
            className="w-20 h-20 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.secondary }}
          >
            <Ionicons name="checkmark" size={40} color={theme.primary} />
          </View>
        </View>

        {/* Heading */}
        <Text
          className="text-3xl font-bold text-center mb-2"
          style={{ color: theme.foreground }}
        >
          Here's {petName}'s profile
        </Text>

        <Text
          className="text-start text-center mb-6"
          style={{ color: theme.foreground, opacity: 0.6 }}
        >
          Review and confirm the details
        </Text>
      </View>

      {/* Profile Details */}
      <ScrollView className="flex-1 px-6">
        <View
          className="rounded-2xl p-4 mb-6"
          style={{ backgroundColor: theme.card }}
        >
          <ProfileField
            label="Country"
            value={petData.country || "Not set"}
            field="country"
            showFlag={true}
            onPickerOpen={() => setShowCountryPicker(true)}
          />

          <ProfileField
            label="Animal"
            value={
              petData.petType
                ? petData.petType.charAt(0).toUpperCase() +
                  petData.petType.slice(1)
                : "Not set"
            }
            field="petType"
            onPickerOpen={() => setShowAnimalTypePicker(true)}
          />

          <ProfileField
            label="Breed"
            value={petData.breed || "Not set"}
            field="breed"
            onPickerOpen={() => setShowBreedPicker(true)}
          />

          <ProfileField
            label="Name"
            value={petData.petName || "Not set"}
            field="petName"
          />

          <ProfileField
            label="Sex"
            value={
              petData.gender
                ? petData.gender.charAt(0).toUpperCase() +
                  petData.gender.slice(1)
                : "Not set"
            }
            field="gender"
            onPickerOpen={() => setShowGenderPicker(true)}
          />

          <ProfileField
            label="Date of Birth"
            value={formatDate(petData.birthDate)}
            field="birthDate"
            onPickerOpen={() => setShowDatePicker(true)}
          />

          <ProfileField
            label="Weight"
            value={
              petData.weight
                ? `${petData.weight} ${petData.weightUnit === "pounds" ? "lbs" : "kg"}`
                : "Not set"
            }
            field="weight"
          />

          <ProfileField
            label="Microchip"
            value={petData.microchipNumber || "Not entered"}
            field="microchip"
          />

          {/* Country Picker Modal */}
          <CountryPicker
            visible={showCountryPicker}
            selectedCountry={petData.country || ""}
            onSelect={(country) => {
              updatePetData({ country });
              setShowCountryPicker(false);
            }}
            onClose={() => setShowCountryPicker(false)}
          />

          {/* Animal Type Picker Modal */}
          <AnimalTypePicker
            visible={showAnimalTypePicker}
            selectedType={(petData.petType as "dog" | "cat") || "dog"}
            onSelect={(type) => {
              updatePetData({ petType: type });
              setShowAnimalTypePicker(false);
            }}
            onClose={() => setShowAnimalTypePicker(false)}
          />

          {/* Breed Picker Modal */}
          <BreedPicker
            visible={showBreedPicker}
            selectedBreed={petData.breed || ""}
            petType={petData.petType || "dog"}
            onSelect={(breed) => {
              updatePetData({ breed });
              setShowBreedPicker(false);
            }}
            onClose={() => setShowBreedPicker(false)}
          />

          {/* Gender Picker Modal */}
          <GenderPicker
            visible={showGenderPicker}
            selectedGender={(petData.gender as "male" | "female") || "male"}
            onSelect={(gender) => {
              updatePetData({ gender });
              setShowGenderPicker(false);
            }}
            onClose={() => setShowGenderPicker(false)}
          />

          {/* Date Picker */}
          {/* Date Picker */}
          <DatePicker
            modal
            open={showDatePicker}
            theme={mode}
            mode="date"
            maximumDate={new Date()}
            minimumDate={new Date(1990, 0, 1)}
            date={tempBirthDate || new Date()}
            onConfirm={(date) => {
              setShowDatePicker(false);
              setTempBirthDate(date);
            }}
            onCancel={() => {
              setShowDatePicker(false);
            }}
          />
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View className="px-6 pb-8">
        <Pressable
          onPress={handleConfirm}
          className="w-full rounded-2xl py-4 px-8 items-center active:opacity-80"
          style={{ backgroundColor: theme.primary }}
        >
          <Text
            className="text-lg font-semibold"
            style={{ color: theme.primaryForeground }}
          >
            Confirm & Continue
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
