import AnimalTypePicker from "@/components/AnimalTypePicker";
import BreedPicker from "@/components/BreedPicker";
import CountryPicker from "@/components/CountryPicker";
import GenderPicker from "@/components/GenderPicker";
import { COUNTRY_FLAGS } from "@/constants/onboarding";
import { useAuth } from "@/context/authContext";
import { useOnboarding } from "@/context/onboardingContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { TablesInsert } from "@/database.types";
import { checkEmailIdAvailable, validateEmailIdFormat } from "@/services/pets";
import { Ionicons } from "@expo/vector-icons";
import { StackActions } from "@react-navigation/native";
import { useNavigation, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import DatePicker from "react-native-date-picker";

const EMAIL_DOMAIN = "@pawbuck.app";

type EditingField = keyof TablesInsert<"pets"> | null;

type Gender = "male" | "female";

export default function OnboardingReview() {
  const router = useRouter();
  const navigation = useNavigation();
  const { theme, toggleTheme, mode } = useTheme();
  const { petData, updatePetData, completeOnboarding } = useOnboarding();
  const { user } = useAuth();
  const { addPet } = usePets();

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showBreedPicker, setShowBreedPicker] = useState(false);
  const [showAnimalTypePicker, setShowAnimalTypePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Temp values for editing
  const [tempPetName, setTempPetName] = useState(petData!.name || "");
  const [tempWeight, setTempWeight] = useState(
    petData!.weight_value?.toString() || ""
  );
  const [tempWeightUnit, setTempWeightUnit] = useState(
    petData!.weight_unit || "pounds"
  );
  const [tempMicrochip, setTempMicrochip] = useState(
    petData!.microchip_number || ""
  );
  const [tempPassport, setTempPassport] = useState(
    petData!.passport_number || ""
  );
  const [tempBirthDate, setTempBirthDate] = useState(
    petData!.date_of_birth ? new Date(petData!.date_of_birth) : new Date()
  );
  const [tempEmailId, setTempEmailId] = useState(petData!.email_id || "");

  // Email validation states
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isEmailAvailable, setIsEmailAvailable] = useState<boolean | null>(
    petData?.email_id ? true : null
  );
  const [emailValidationError, setEmailValidationError] = useState<
    string | null
  >(null);
  const [emailCheckError, setEmailCheckError] = useState<string | null>(null);

  // Debounced email availability check when editing
  useEffect(() => {
    if (editingField !== "email_id") return;

    const trimmedEmailId = tempEmailId.trim().toLowerCase();

    // Reset states
    setIsEmailAvailable(null);
    setEmailCheckError(null);

    // If email hasn't changed from the original, mark as available
    if (trimmedEmailId === petData?.email_id?.toLowerCase()) {
      setEmailValidationError(null);
      setIsEmailAvailable(true);
      return;
    }

    // Validate format first
    const { isValid, error } = validateEmailIdFormat(trimmedEmailId);
    if (!isValid) {
      setEmailValidationError(error || null);
      return;
    }
    setEmailValidationError(null);

    // Check availability after a delay
    const timeoutId = setTimeout(async () => {
      setIsCheckingEmail(true);
      try {
        const available = await checkEmailIdAvailable(trimmedEmailId);
        setIsEmailAvailable(available);
        if (!available) {
          setEmailCheckError("This email ID is already taken");
        }
      } catch {
        setEmailCheckError("Failed to check availability");
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [tempEmailId, editingField, petData?.email_id]);

  const petName = petData!.name || "your pet";

  const handleConfirm = async () => {
    if (user) {
      // Already authenticated → create pet directly, then go back
      try {
        await addPet(petData as TablesInsert<"pets">);
        const parent = navigation.getParent();
        parent?.dispatch(StackActions.pop());
      } catch (error) {
        console.error("Error creating pet:", error);
      }
    } else {
      // Not authenticated → save to context and go directly to signup
      completeOnboarding();
      router.replace("/signup");
    }
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
    if (field === "name") {
      updatePetData({ name: tempPetName });
    } else if (field === "weight_value") {
      const weightValue = parseFloat(tempWeight);
      if (!isNaN(weightValue)) {
        updatePetData({
          weight_value: weightValue,
          weight_unit: tempWeightUnit,
        });
      }
    } else if (field === "microchip_number") {
      updatePetData({ microchip_number: tempMicrochip });
    } else if (field === "passport_number") {
      updatePetData({ passport_number: tempPassport });
    } else if (field === "date_of_birth") {
      updatePetData({ date_of_birth: tempBirthDate.toISOString() });
    } else if (field === "email_id") {
      if (
        isEmailAvailable &&
        !emailValidationError &&
        !emailCheckError &&
        !isCheckingEmail
      ) {
        updatePetData({ email_id: tempEmailId.trim().toLowerCase() });
      } else {
        return; // Don't save if email is invalid
      }
    }
    setEditingField(null);
  };

  const handleCancelEdit = () => {
    // Reset temp values
    setTempPetName(petData?.name || "");
    setTempWeight(petData?.weight_value?.toString() || "");
    setTempWeightUnit(petData?.weight_unit || "pounds");
    setTempMicrochip(petData?.microchip_number || "");
    setTempPassport(petData?.passport_number || "");
    setTempBirthDate(
      petData?.date_of_birth ? new Date(petData.date_of_birth) : new Date()
    );
    setTempEmailId(petData?.email_id || "");
    // Reset email validation states
    setEmailValidationError(null);
    setEmailCheckError(null);
    setIsEmailAvailable(petData?.email_id ? true : null);
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
                  petData?.country &&
                  COUNTRY_FLAGS[petData?.country] && (
                    <Text className="text-lg mr-2">
                      {COUNTRY_FLAGS[petData?.country]}
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
                {field === "name" && (
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
                {field === "weight_value" && (
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
                {field === "microchip_number" && (
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
                {field === "passport_number" && (
                  <TextInput
                    className="text-lg font-semibold rounded-lg px-3 py-2"
                    style={{
                      color: theme.foreground,
                      backgroundColor: theme.background,
                      borderWidth: 1,
                      borderColor: theme.primary,
                    }}
                    value={tempPassport}
                    onChangeText={setTempPassport}
                    placeholder="e.g., US-2022-12345"
                    placeholderTextColor={
                      mode === "dark" ? "#6B7280" : "#9CA3AF"
                    }
                  />
                )}
                {field === "email_id" && (
                  <View>
                    <View
                      className="flex-row items-center rounded-lg"
                      style={{
                        backgroundColor: theme.background,
                        borderWidth: 1,
                        borderColor:
                          emailValidationError || emailCheckError
                            ? "#EF4444"
                            : isEmailAvailable
                              ? "#22C55E"
                              : theme.primary,
                      }}
                    >
                      <TextInput
                        className="flex-1 text-lg font-semibold px-3 py-2"
                        style={{
                          color: theme.foreground,
                        }}
                        value={tempEmailId}
                        onChangeText={(text) =>
                          setTempEmailId(text.toLowerCase())
                        }
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoFocus
                        placeholder="e.g., buddy"
                        placeholderTextColor={
                          mode === "dark" ? "#6B7280" : "#9CA3AF"
                        }
                      />
                      <Text
                        className="pr-2"
                        style={{ color: theme.foreground, opacity: 0.6 }}
                      >
                        {EMAIL_DOMAIN}
                      </Text>
                      <View className="pr-2">
                        {isCheckingEmail ? (
                          <ActivityIndicator size="small" color={theme.primary} />
                        ) : emailValidationError || emailCheckError ? (
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color="#EF4444"
                          />
                        ) : isEmailAvailable ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#22C55E"
                          />
                        ) : null}
                      </View>
                    </View>
                    {(emailValidationError || emailCheckError) && (
                      <Text className="text-xs mt-1" style={{ color: "#EF4444" }}>
                        {emailValidationError || emailCheckError}
                      </Text>
                    )}
                    {isEmailAvailable &&
                      !emailValidationError &&
                      !emailCheckError && (
                        <Text
                          className="text-xs mt-1"
                          style={{ color: "#22C55E" }}
                        >
                          Email ID is available
                        </Text>
                      )}
                  </View>
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
            value={petData?.country || "Not set"}
            field="country"
            showFlag={true}
            onPickerOpen={() => setShowCountryPicker(true)}
          />

          <ProfileField
            label="Animal"
            value={
              petData?.animal_type
                ? petData?.animal_type.charAt(0).toUpperCase() +
                  petData?.animal_type.slice(1)
                : "Not set"
            }
            field="animal_type"
            onPickerOpen={() => setShowAnimalTypePicker(true)}
          />

          <ProfileField
            label="Breed"
            value={petData?.breed || "Not set"}
            field="breed"
            onPickerOpen={() => setShowBreedPicker(true)}
          />

          <ProfileField
            label="Name"
            value={petData?.name || "Not set"}
            field="name"
          />

          <ProfileField
            label="Email ID"
            value={
              petData?.email_id
                ? `${petData.email_id}${EMAIL_DOMAIN}`
                : "Not set"
            }
            field="email_id"
          />

          <ProfileField
            label="Sex"
            value={
              petData?.sex
                ? petData?.sex.charAt(0).toUpperCase() + petData?.sex.slice(1)
                : "Not set"
            }
            field="sex"
            onPickerOpen={() => setShowGenderPicker(true)}
          />

          <ProfileField
            label="Date of Birth"
            value={formatDate(petData?.date_of_birth)}
            field="date_of_birth"
            onPickerOpen={() => setShowDatePicker(true)}
          />

          <ProfileField
            label="Weight"
            value={
              petData?.weight_value
                ? `${petData?.weight_value} ${petData?.weight_unit === "pounds" ? "lbs" : "kg"}`
                : "Not set"
            }
            field="weight_value"
          />

          <ProfileField
            label="Microchip"
            value={petData?.microchip_number || "Not entered"}
            field="microchip_number"
          />

          <ProfileField
            label="Pet Passport Number"
            value={petData?.passport_number || "Not entered"}
            field="passport_number"
          />

          {/* Country Picker Modal */}
          <CountryPicker
            visible={showCountryPicker}
            selectedCountry={petData?.country || ""}
            onSelect={(country) => {
              updatePetData({ country });
              setShowCountryPicker(false);
            }}
            onClose={() => setShowCountryPicker(false)}
          />

          {/* Animal Type Picker Modal */}
          <AnimalTypePicker
            visible={showAnimalTypePicker}
            selectedType={(petData?.animal_type as "dog" | "cat") || "dog"}
            onSelect={(type) => {
              updatePetData({ animal_type: type });
              setShowAnimalTypePicker(false);
            }}
            onClose={() => setShowAnimalTypePicker(false)}
          />

          {/* Breed Picker Modal */}
          <BreedPicker
            visible={showBreedPicker}
            selectedBreed={petData?.breed || ""}
            petType={(petData?.animal_type as "dog" | "cat" | "other") || "dog"}
            onSelect={(breed) => {
              updatePetData({ breed });
              setShowBreedPicker(false);
            }}
            onClose={() => setShowBreedPicker(false)}
          />

          {/* Gender Picker Modal */}
          <GenderPicker
            visible={showGenderPicker}
            selectedGender={(petData?.sex as Gender) || "male"}
            onSelect={(gender) => {
              updatePetData({ sex: gender });
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
            {user ? "Save Pet" : "Confirm & Continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
