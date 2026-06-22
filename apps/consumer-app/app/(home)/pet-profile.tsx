import CountryPicker from "@/components/common/CountryPicker";
import { SettingsSubscreenLayout } from "@/components/layout/SettingsSubscreenLayout";
import { SettingsSubscreenTile } from "@/components/layout/SettingsSubscreenTile";
import { getSettingsSubscreenTokens } from "@/components/layout/settingsSubscreenTokens";
import { PetProfileLockedBadge } from "@/components/pet/PetProfileFieldRow";
import PrivateImage from "@/components/common/PrivateImage";
import { PetActivityFeed } from "@/components/pet/PetActivityFeed";
import { PetNotificationPrefsSection } from "@/components/pet/PetNotificationPrefsSection";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useSubscription } from "@/context/subscriptionContext";
import { useTheme } from "@/context/themeContext";
import { getPetTransferHistory } from "@/services/petTransfers";
import { generateAndSharePetPassport } from "@/services/pdfGenerator";
import { formatPetInboundEmail } from "@/utils/petEmail";
import { getPrivateImageUrl } from "@/utils/image";
import { supabase } from "@/utils/supabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export default function PetProfile() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  const subscreen = getSettingsSubscreenTokens(theme, isDarkMode);
  const { pets, deletePet, deletingPet, loadingPets, updatePet, updatingPet } = usePets();
  const { selectedPetId, selectedPet, setSelectedPetId } = useSelectedPet();
  const { ensurePlan } = useSubscription();
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [petImageUrl, setPetImageUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedWeightValue, setEditedWeightValue] = useState<string>("");
  const [editedColor, setEditedColor] = useState<string>("");
  const [editedCountry, setEditedCountry] = useState<string>("");
  const [editedMicrochipNumber, setEditedMicrochipNumber] = useState<string>("");
  const [editedPassportNumber, setEditedPassportNumber] = useState<string>("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Get current pet from context
  const currentPet = selectedPet || pets[0];

  const { data: transferLog = [] } = useQuery({
    queryKey: ["pet_transfer_history", currentPet?.id],
    queryFn: () => getPetTransferHistory(currentPet!.id),
    enabled: !!currentPet?.id,
  });

  // Load pet image
  useEffect(() => {
    if (currentPet?.photo_url) {
      getPrivateImageUrl(currentPet.photo_url).then((url) => setPetImageUrl(url));
    } else {
      setPetImageUrl(null);
    }
  }, [currentPet?.photo_url]);

  // Initialize edit values when entering edit mode
  useEffect(() => {
    if (currentPet && isEditing) {
      // Initialize weight value based on current display unit
      const isKg = currentPet.weight_unit === "kg" || currentPet.weight_unit === "kilograms";
      if (weightUnit === "kg" && isKg) {
        setEditedWeightValue(currentPet.weight_value?.toString() || "");
      } else if (weightUnit === "kg" && !isKg) {
        setEditedWeightValue(
          currentPet.weight_value != null
            ? (currentPet.weight_value / 2.20462).toFixed(1)
            : ""
        );
      } else if (weightUnit === "lbs" && isKg) {
        setEditedWeightValue(
          currentPet.weight_value != null
            ? (currentPet.weight_value * 2.20462).toFixed(1)
            : ""
        );
      } else {
        setEditedWeightValue(currentPet.weight_value?.toString() || "");
      }
      setEditedColor((currentPet as any).color || "");
      setEditedCountry(currentPet.country || "");
      setEditedMicrochipNumber(currentPet.microchip_number || "");
      setEditedPassportNumber((currentPet as any).pet_passport_number || "");
    }
  }, [isEditing, currentPet, weightUnit]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const convertWeight = (weightValue: number | null, weightUnitInDb: string | null) => {
    if (!weightValue) return "Not set";
    const isKg = weightUnitInDb === "kg" || weightUnitInDb === "kilograms";
    
    if (weightUnit === "kg") {
      if (isKg) {
        return `${weightValue} kg`;
      } else {
        // Convert from lbs to kg
        const weightKg = (weightValue / 2.20462).toFixed(1);
        return `${weightKg} kg`;
      }
    } else {
      if (isKg) {
        // Convert from kg to lbs
        const weightLbs = (weightValue * 2.20462).toFixed(1);
        return `${weightLbs} lbs`;
      } else {
        return `${weightValue} lbs`;
      }
    }
  };

  const getPetEmail = (pet: typeof currentPet) => {
    if (!pet) return "";
    return formatPetInboundEmail(pet.email_id, pet.name);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const capitalizeWords = (text: string | null | undefined) => {
    if (!text || text === "Not set") return text;
    return text
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedWeightValue("");
    setEditedColor("");
    setEditedCountry("");
    setEditedMicrochipNumber("");
    setEditedPassportNumber("");
  };

  const handleSave = async () => {
    if (!currentPet) return;

    try {
      // Convert weight value based on selected unit
      const weightValueNum = parseFloat(editedWeightValue);
      if (isNaN(weightValueNum) || weightValueNum <= 0) {
        Alert.alert("Invalid Weight", "Please enter a valid weight value");
        return;
      }

      // Prepare update data
      const updateData: any = {};
      
      // Handle weight - convert to kg for storage if needed
      if (weightUnit === "kg") {
        updateData.weight_value = weightValueNum;
        updateData.weight_unit = "kg";
      } else {
        // Convert lbs to kg for storage
        updateData.weight_value = weightValueNum / 2.20462;
        updateData.weight_unit = "pounds";
      }

      // Handle color if the field exists
      if ((currentPet as any).color !== undefined || editedColor) {
        updateData.color = editedColor;
      }

      // Handle country
      if (editedCountry) {
        updateData.country = editedCountry;
      }

      // Handle microchip number - only update if it's empty in the database
      if (!currentPet.microchip_number && editedMicrochipNumber.trim()) {
        // Validate microchip number (should be 15 digits)
        if (editedMicrochipNumber.trim().length !== 15) {
          Alert.alert("Invalid Microchip Number", "Microchip number must be exactly 15 digits");
          return;
        }
        updateData.microchip_number = editedMicrochipNumber.trim();
      }

      // Handle passport number - only update if it's empty in the database
      if (!(currentPet as any).pet_passport_number && editedPassportNumber.trim()) {
        updateData.pet_passport_number = editedPassportNumber.trim();
      }

      await updatePet(currentPet.id, updateData);
      setIsEditing(false);
      Alert.alert("Success", "Pet information updated successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update pet information");
    }
  };

  const fieldIconWell = {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: subscreen.iconWellBg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 12,
  };
  const inputBg = subscreen.nestedBg;
  const unitToggleOffBg = subscreen.nestedBg;

  if (loadingPets) {
    return (
      <SettingsSubscreenLayout title="Pet Profile" scroll={false}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-base" style={{ color: subscreen.muted, fontFamily: "Poppins_400Regular" }}>
            Loading...
          </Text>
        </View>
      </SettingsSubscreenLayout>
    );
  }

  if (!currentPet || pets.length === 0) {
    return (
      <SettingsSubscreenLayout title="Pet Profile" scroll={false}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-base" style={{ color: subscreen.muted, fontFamily: "Poppins_400Regular" }}>
            No pets found
          </Text>
        </View>
      </SettingsSubscreenLayout>
    );
  }

  const deleteFooter = (
    <View
      className="px-5 pb-4 pt-4 border-t"
      style={{ borderTopColor: subscreen.borderSubtle, backgroundColor: subscreen.pageBg }}
    >
      <Pressable
        onPress={() => {
          Alert.alert(
            "Delete Pet",
            `Are you sure you want to delete ${currentPet.name}? This action cannot be undone.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deletePet(currentPet.id);
                    Alert.alert("Success", "Pet deleted successfully");
                    if (pets.length > 1) {
                      const remainingPets = pets.filter((p) => p.id !== currentPet.id);
                      if (remainingPets.length > 0) {
                        setSelectedPetId(remainingPets[0].id);
                      }
                    } else {
                      router.back();
                    }
                  } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : "Failed to delete pet";
                    Alert.alert("Error", message);
                  }
                },
              },
            ]
          );
        }}
        disabled={deletingPet}
        className="rounded-xl py-4 px-6 items-center justify-center active:opacity-70"
        style={{
          backgroundColor: deletingPet ? subscreen.lockedBadgeBg : theme.error,
          opacity: deletingPet ? 0.5 : 1,
        }}
      >
        <Text className="text-base font-semibold" style={{ color: "#FFFFFF", fontFamily: "Poppins_600SemiBold" }}>
          {deletingPet ? "Deleting..." : "Delete Pet"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <SettingsSubscreenLayout title="Pet Profile" footer={deleteFooter}>
          {pets.length > 1 && (
            <View className="flex-row gap-0 mb-4">
              {pets.map((pet) => {
                const isSelected = currentPet.id === pet.id;
                return (
                  <Pressable
                    key={pet.id}
                    onPress={() => setSelectedPetId(pet.id)}
                    className="items-center"
                  >
                    <View className="w-[76px] h-[84px] items-center justify-center">
                      <View
                        className="relative"
                        style={{
                          padding: 4,
                          borderRadius: 50,
                          borderWidth: isSelected ? 3 : 2,
                          borderColor: isSelected ? theme.primary : "transparent",
                        }}
                      >
                        <View
                          className="w-16 h-16 rounded-full overflow-hidden items-center justify-center"
                          style={{ backgroundColor: subscreen.nestedBg }}
                        >
                          {pet.photo_url ? (
                            <PrivateImage
                              bucketName="pets"
                              filePath={pet.photo_url}
                              className="w-16 h-16"
                              resizeMode="cover"
                            />
                          ) : (
                            <MaterialCommunityIcons
                              name="paw"
                              size={28}
                              color={theme.secondary}
                            />
                          )}
                        </View>
                      </View>
                      <Text
                        className="text-xs font-medium mt-2"
                        style={{
                          color: isSelected ? theme.foreground : theme.secondary,
                        }}
                      >
                        {pet.name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Main Pet Profile Section */}
          <View className="items-center mb-6">
            <View className="relative mb-4">
              <View className="w-40 h-40 rounded-full overflow-hidden items-center justify-center" style={{ backgroundColor: subscreen.nestedBg }}>
                {currentPet.photo_url ? (
                  <PrivateImage
                    bucketName="pets"
                    filePath={currentPet.photo_url}
                    className="w-40 h-40"
                    resizeMode="cover"
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="paw"
                    size={60}
                    color={theme.secondary}
                  />
                )}
              </View>
              <Pressable
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: theme.primary }}
              >
                <Ionicons name="camera-outline" size={20} color={theme.primaryForeground} />
              </Pressable>
            </View>
            <Text
              className="text-3xl font-bold mb-1"
              style={{ color: theme.foreground }}
            >
              {currentPet.name}
            </Text>
            <Text className="text-base" style={{ color: theme.secondary }}>
              {getPetEmail(currentPet)}
            </Text>
            {currentPet.pet_parent_display_name ? (
              <Text className="text-sm mt-2 text-center px-4" style={{ color: theme.secondary }}>
                Pet parent: {currentPet.pet_parent_display_name}
              </Text>
            ) : null}
          </View>

          {/* Download Pet Passport Button */}
          <SettingsSubscreenTile style={{ marginTop: 0 }}>
            <Pressable
              onPress={() => {
                if (downloading || !currentPet) return;
                ensurePlan("individual", async () => {
                  setDownloading(true);
                  try {
                    await generateAndSharePetPassport({
                      pet: currentPet,
                      vaccinations: [],
                    });
                  } catch (error: any) {
                    Alert.alert("Error", error.message || "Failed to generate PDF");
                  } finally {
                    setDownloading(false);
                  }
                }, "pet_passport_export");
              }}
              className="flex-row items-center active:opacity-80"
              style={{ opacity: downloading ? 0.6 : 1 }}
            >
              {downloading ? (
                <View className="flex-row items-center">
                  <Text className="text-base font-semibold" style={{ color: theme.foreground }}>
                    Generating...
                  </Text>
                </View>
              ) : (
                <>
                  <Ionicons name="download-outline" size={24} color={theme.foreground} />
                  <View className="flex-1 ml-4">
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.foreground }}
                    >
                      Download Pet Passport
                    </Text>
                  </View>
                </>
              )}
            </Pressable>
          </SettingsSubscreenTile>

          {transferLog.length > 0 ? (
            <SettingsSubscreenTile heading="Transfer history">
              {transferLog.map((row, idx) => {
                const label =
                  row.prior_owner_display_snapshot?.trim() || "Previous owner";
                const d = row.used_at
                  ? new Date(row.used_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "";
                return (
                  <View
                    key={row.id}
                    className="py-3"
                    style={
                      idx < transferLog.length - 1
                        ? { borderBottomWidth: 1, borderBottomColor: theme.border }
                        : undefined
                    }
                  >
                    <Text style={{ color: theme.foreground }}>
                      Ownership received from{" "}
                      <Text className="font-semibold">{label}</Text>
                    </Text>
                    <Text className="text-sm mt-1" style={{ color: theme.secondary }}>
                      {d}
                    </Text>
                  </View>
                );
              })}
            </SettingsSubscreenTile>
          ) : null}

          {/* Pet Information Section */}
          <View className="mb-2">
            <View className="flex-row items-center justify-between mb-2">
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 16,
                  color: subscreen.title,
                }}
              >
                Pet Information
              </Text>
              {!isEditing ? (
                <Pressable onPress={handleEdit} className="active:opacity-70">
                  <Ionicons name="pencil-outline" size={20} color={theme.secondary} />
                </Pressable>
              ) : (
                <View className="flex-row items-center gap-3">
                  <Pressable onPress={handleCancel} className="active:opacity-70">
                    <Text className="text-base" style={{ color: theme.secondary }}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable 
                    onPress={handleSave} 
                    disabled={updatingPet}
                    className="active:opacity-70"
                  >
                    <Text 
                      className="text-base font-semibold" 
                      style={{ color: updatingPet ? theme.secondary : theme.primary }}
                    >
                      {updatingPet ? "Saving..." : "Save"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            <SettingsSubscreenTile style={{ marginTop: 0 }}>
              {/* Animal Type */}
              <View className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.border }}>
                <View
                  style={fieldIconWell}
                >
                  <MaterialCommunityIcons
                    name="paw"
                    size={20}
                    color={subscreen.iconFg}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.secondary }}>
                    Animal Type
                  </Text>
                  <Text
                    className="text-base font-medium"
                    style={{ color: theme.foreground }}
                  >
                    {capitalizeWords((currentPet as any).animal_type) || "Not set"}
                  </Text>
                </View>
                <PetProfileLockedBadge />
              </View>

              {/* Breed */}
              <View className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.border }}>
                <View
                  style={fieldIconWell}
                >
                  <MaterialCommunityIcons
                    name="paw"
                    size={20}
                    color={subscreen.iconFg}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.secondary }}>
                    Breed
                  </Text>
                  <Text
                    className="text-base font-medium"
                    style={{ color: theme.foreground }}
                  >
                    {capitalizeWords(currentPet.breed) || "Not set"}
                  </Text>
                </View>
                <PetProfileLockedBadge />
              </View>

              {/* Date of Birth */}
              <View className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.border }}>
                <View
                  style={fieldIconWell}
                >
                  <Ionicons name="calendar-outline" size={20} color={subscreen.iconFg} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.secondary }}>
                    Date of Birth
                  </Text>
                  <Text
                    className="text-base font-medium"
                    style={{ color: theme.foreground }}
                  >
                    {formatDate(currentPet.date_of_birth)}
                  </Text>
                </View>
                <PetProfileLockedBadge />
              </View>

              {/* Gender */}
              <View className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.border }}>
                <View
                  style={fieldIconWell}
                >
                  <Ionicons name="person-outline" size={20} color={subscreen.iconFg} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.secondary }}>
                    Gender
                  </Text>
                  <Text
                    className="text-base font-medium"
                    style={{ color: theme.foreground }}
                  >
                    {capitalizeWords(currentPet.sex) || "Not set"}
                  </Text>
                </View>
                <PetProfileLockedBadge />
              </View>

              {/* Weight */}
              <View className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.border }}>
                <View
                  style={fieldIconWell}
                >
                  <MaterialCommunityIcons
                    name="scale-bathroom"
                    size={20}
                    color={subscreen.iconFg}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.secondary }}>
                    Weight
                  </Text>
                  {isEditing ? (
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        className="flex-1 py-2 px-3 rounded-lg font-medium"
                        style={{
                          backgroundColor: isDarkMode ? inputBg : theme.border,
                          color: theme.foreground,
                        }}
                        value={editedWeightValue}
                        onChangeText={setEditedWeightValue}
                        placeholder="Enter weight"
                        placeholderTextColor={theme.secondary}
                        keyboardType="numeric"
                      />
                      <View className="flex-row items-center gap-1.5">
                        <Pressable
                          onPress={() => setWeightUnit("kg")}
                          className="px-3 py-1.5 rounded-lg"
                          style={{
                            backgroundColor: weightUnit === "kg" ? theme.primary : (isDarkMode ? inputBg : theme.border),
                          }}
                        >
                          <Text
                            className="text-sm font-medium"
                            style={{ color: weightUnit === "kg" ? theme.primaryForeground : theme.foreground }}
                          >
                            kg
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setWeightUnit("lbs")}
                          className="px-3 py-1.5 rounded-lg"
                          style={{
                            backgroundColor: weightUnit === "lbs" ? theme.primary : (isDarkMode ? inputBg : theme.border),
                          }}
                        >
                          <Text
                            className="text-sm font-medium"
                            style={{ color: weightUnit === "lbs" ? theme.primaryForeground : theme.foreground }}
                          >
                            lbs
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text
                        className="text-base font-medium"
                        style={{ color: theme.foreground }}
                      >
                        {convertWeight(currentPet.weight_value, currentPet.weight_unit)}
                      </Text>
                      <View className="flex-row items-center gap-1.5 mt-1">
                        <Pressable
                          onPress={() => setWeightUnit("kg")}
                          className="px-3 py-1.5 rounded-lg"
                          style={{
                            backgroundColor: weightUnit === "kg" ? theme.primary : (isDarkMode ? inputBg : theme.border),
                          }}
                        >
                          <Text
                            className="text-sm font-medium"
                            style={{ color: weightUnit === "kg" ? theme.primaryForeground : theme.foreground }}
                          >
                            kg
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setWeightUnit("lbs")}
                          className="px-3 py-1.5 rounded-lg"
                          style={{
                            backgroundColor: weightUnit === "lbs" ? theme.primary : (isDarkMode ? inputBg : theme.border),
                          }}
                        >
                          <Text
                            className="text-sm font-medium"
                            style={{ color: weightUnit === "lbs" ? theme.primaryForeground : theme.foreground }}
                          >
                            lbs
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              </View>

              {/* Color */}
              <View className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.border }}>
                <View
                  style={fieldIconWell}
                >
                  <MaterialCommunityIcons
                    name="palette"
                    size={20}
                    color={subscreen.iconFg}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.secondary }}>
                    Color
                  </Text>
                  {isEditing ? (
                    <TextInput
                      className="py-2 px-3 rounded-lg font-medium"
                      style={{
                        backgroundColor: isDarkMode ? inputBg : theme.border,
                        color: theme.foreground,
                      }}
                      value={editedColor}
                      onChangeText={setEditedColor}
                      placeholder="Enter color"
                      placeholderTextColor={theme.secondary}
                    />
                  ) : (
                    <Text
                      className="text-base font-medium"
                      style={{ color: theme.foreground }}
                    >
                      {(currentPet as any).color || "Not set"}
                    </Text>
                  )}
                </View>
              </View>

              {/* Microchip Number */}
              <View className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.border }}>
                <View
                  style={fieldIconWell}
                >
                  <MaterialCommunityIcons
                    name="chip"
                    size={20}
                    color={subscreen.iconFg}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.secondary }}>
                    Microchip Number
                  </Text>
                  {isEditing && !currentPet.microchip_number ? (
                    <TextInput
                      className="py-2 px-3 rounded-lg font-medium"
                      style={{
                        backgroundColor: isDarkMode ? inputBg : theme.border,
                        color: theme.foreground,
                        maxWidth: "90%", // Limit width to prevent overflow
                      }}
                      value={editedMicrochipNumber}
                      onChangeText={(text) => {
                        // Only allow digits and limit to 15 characters
                        const digitsOnly = text.replace(/[^0-9]/g, "");
                        if (digitsOnly.length <= 15) {
                          setEditedMicrochipNumber(digitsOnly);
                        }
                      }}
                      placeholder="Enter 15-digit microchip number"
                      placeholderTextColor={theme.secondary}
                      keyboardType="numeric"
                      maxLength={15}
                    />
                  ) : (
                    <Text
                      className="text-base font-medium"
                      style={{ color: theme.foreground }}
                    >
                      {currentPet.microchip_number || "Not set"}
                    </Text>
                  )}
                </View>
                <View className="ml-2" style={{ minWidth: 60, alignItems: "flex-end" }}>
                  {currentPet.microchip_number ? (
                    <View className="px-2 py-1 rounded" style={{ backgroundColor: isDarkMode ? inputBg : theme.border }}>
                      <Text className="text-xs" style={{ color: theme.secondary }}>
                        Locked
                      </Text>
                    </View>
                  ) : isEditing ? (
                    <Pressable
                      onPress={handleCancel}
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: isDarkMode ? inputBg : theme.border }}
                    >
                      <Text className="text-xs" style={{ color: theme.secondary }}>
                        Cancel
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={handleEdit}
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: `${theme.primary}22` }}
                    >
                      <Ionicons name="pencil-outline" size={16} color={theme.primary} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Pet Passport Number */}
              <View className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.border }}>
                <View
                  style={fieldIconWell}
                >
                  <MaterialCommunityIcons
                    name="chip"
                    size={20}
                    color={subscreen.iconFg}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.secondary }}>
                    Pet Passport Number
                  </Text>
                  {isEditing && !(currentPet as any).pet_passport_number ? (
                    <TextInput
                      className="py-2 px-3 rounded-lg font-medium"
                      style={{
                        backgroundColor: isDarkMode ? inputBg : theme.border,
                        color: theme.foreground,
                        maxWidth: "90%", // Limit width to prevent overflow
                      }}
                      value={editedPassportNumber}
                      onChangeText={(text) => {
                        // Limit to 20 characters (typical passport number length)
                        if (text.length <= 20) {
                          setEditedPassportNumber(text);
                        }
                      }}
                      placeholder="Enter passport number"
                      placeholderTextColor={theme.secondary}
                      maxLength={20}
                    />
                  ) : (
                    <Text
                      className="text-base font-medium"
                      style={{ color: theme.foreground }}
                    >
                      {(currentPet as any).pet_passport_number || "Not set"}
                    </Text>
                  )}
                </View>
                <View className="ml-2" style={{ minWidth: 60, alignItems: "flex-end" }}>
                  {(currentPet as any).pet_passport_number ? (
                    <View className="px-2 py-1 rounded" style={{ backgroundColor: isDarkMode ? inputBg : theme.border }}>
                      <Text className="text-xs" style={{ color: theme.secondary }}>
                        Locked
                      </Text>
                    </View>
                  ) : isEditing ? (
                    <Pressable
                      onPress={handleCancel}
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: isDarkMode ? inputBg : theme.border }}
                    >
                      <Text className="text-xs" style={{ color: theme.secondary }}>
                        Cancel
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={handleEdit}
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: `${theme.primary}22` }}
                    >
                      <Ionicons name="pencil-outline" size={16} color={theme.primary} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Country */}
              <View className="flex-row items-center py-3">
                <View
                  style={fieldIconWell}
                >
                  <Ionicons name="globe-outline" size={20} color={subscreen.iconFg} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.secondary }}>
                    Country
                  </Text>
                  {isEditing ? (
                    <Pressable
                      onPress={() => setShowCountryPicker(true)}
                      className="py-2 px-3 rounded-lg flex-row items-center justify-between"
                      style={{
                        backgroundColor: isDarkMode ? inputBg : theme.border,
                      }}
                    >
                      <Text
                        className="text-base font-medium"
                        style={{ color: theme.foreground }}
                      >
                        {editedCountry || "Select country"}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.secondary} />
                    </Pressable>
                  ) : (
                    <Text
                      className="text-base font-medium"
                      style={{ color: theme.foreground }}
                    >
                      {currentPet.country || "Not set"}
                    </Text>
                  )}
                </View>
              </View>
            </SettingsSubscreenTile>
          </View>

          <SettingsSubscreenTile heading="Notification preferences">
            <PetNotificationPrefsSection petId={currentPet.id} />
          </SettingsSubscreenTile>

          <SettingsSubscreenTile heading="Family activity">
            <PetActivityFeed petId={currentPet.id} />
          </SettingsSubscreenTile>

        <CountryPicker
          visible={showCountryPicker}
          selectedCountry={editedCountry}
          onSelect={(country) => {
            setEditedCountry(country);
            setShowCountryPicker(false);
          }}
          onClose={() => setShowCountryPicker(false)}
        />
    </SettingsSubscreenLayout>
  );
}

