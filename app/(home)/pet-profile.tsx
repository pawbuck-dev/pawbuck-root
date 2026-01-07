import BottomNavBar from "@/components/home/BottomNavBar";
import { useTheme } from "@/context/themeContext";
import { usePets } from "@/context/petsContext";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import PetImage from "@/components/home/PetImage";
import { getPrivateImageUrl } from "@/utils/image";
import { generatePetPassportPDF } from "@/services/pdfGenerator";
import { supabase } from "@/utils/supabase";
import PrivateImage from "@/components/PrivateImage";

export default function PetProfile() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  const { pets, deletePet, deletingPet, loadingPets, updatePet, updatingPet } = usePets();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [petImageUrl, setPetImageUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedWeightValue, setEditedWeightValue] = useState<string>("");
  const [editedColor, setEditedColor] = useState<string>("");

  // Select first pet by default when pets load
  useEffect(() => {
    if (pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id);
    }
  }, [pets, selectedPetId]);

  // Get current pet
  const currentPet = pets.find((p) => p.id === selectedPetId) || pets[0];

  // Load pet image
  useEffect(() => {
    if (currentPet?.photo_url) {
      getPrivateImageUrl(currentPet.photo_url)
        .then((url) => setPetImageUrl(url))
        .catch(() => setPetImageUrl(null));
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
        setEditedWeightValue((currentPet.weight_value / 2.20462).toFixed(1));
      } else if (weightUnit === "lbs" && isKg) {
        setEditedWeightValue((currentPet.weight_value * 2.20462).toFixed(1));
      } else {
        setEditedWeightValue(currentPet.weight_value?.toString() || "");
      }
      setEditedColor((currentPet as any).color || "");
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
    return pet.email_id ? `${pet.email_id}@pawbuck.app` : `${pet.name.toLowerCase().replace(/\s+/g, "")}@pawbuck.app`;
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

      await updatePet(currentPet.id, updateData);
      setIsEditing(false);
      Alert.alert("Success", "Pet information updated successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update pet information");
    }
  };

  // Show loading state
  if (loadingPets) {
    return (
        <View className="flex-1" style={{ backgroundColor: theme.background }}>
          <View className="flex-1 items-center justify-center">
            <Text className="text-base" style={{ color: theme.secondary }}>
              Loading...
            </Text>
          </View>
          <BottomNavBar activeTab="profile" />
        </View>
    );
  }

  // Show no pets state
  if (!currentPet || pets.length === 0) {
    return (
        <View className="flex-1" style={{ backgroundColor: theme.background }}>
          <View className="flex-1 items-center justify-center">
            <Text className="text-base" style={{ color: theme.secondary }}>
              No pets found
            </Text>
          </View>
          <BottomNavBar activeTab="profile" />
        </View>
    );
  }

  return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {/* Header */}
        <View className="px-6 pt-14 pb-4">
          <View className="flex-row items-center mb-4">
            <Pressable
              onPress={() => router.back()}
              className="mr-4 active:opacity-70"
            >
              <Ionicons name="chevron-back" size={24} color={theme.foreground} />
            </Pressable>
            <Text className="text-2xl font-bold flex-1" style={{ color: theme.foreground }}>
              Pet Profile
            </Text>
          </View>

          {/* Pet Selection Tabs */}
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
                          style={{ backgroundColor: theme.card }}
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
        </View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Main Pet Profile Section */}
          <View className="items-center mb-6">
            <View className="relative mb-4">
              <View className="w-40 h-40 rounded-full overflow-hidden items-center justify-center" style={{ backgroundColor: theme.card }}>
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
          </View>

          {/* Download Pet Passport Button */}
          <View className="px-0 mb-6">
            <Pressable
              onPress={async () => {
                if (downloading || !currentPet) return;
                setDownloading(true);
                try {
                  // Fetch vaccinations for this pet
                  const { data: petVaccinations } = await supabase
                    .from("vaccinations")
                    .select("*")
                    .eq("pet_id", currentPet.id)
                    .order("date", { ascending: false });

                  await generatePetPassportPDF({
                    pet: currentPet,
                    vaccinations: petVaccinations || [],
                  });
                  Alert.alert("Success", "Pet passport PDF generated successfully");
                } catch (error: any) {
                  Alert.alert("Error", error.message || "Failed to generate PDF");
                } finally {
                  setDownloading(false);
                }
              }}
              disabled={downloading}
              className="rounded-2xl py-4 px-4 flex-row items-center active:opacity-80"
              style={{
                backgroundColor: theme.card,
                opacity: downloading ? 0.6 : 1,
              }}
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
          </View>

          {/* Pet Information Section */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text
                className="text-xl font-bold"
                style={{ color: theme.foreground }}
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

            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: theme.card }}
            >
              {/* Animal Type */}
              <View className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.border }}>
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${theme.primary}20` }}
                >
                  <MaterialCommunityIcons
                    name="paw"
                    size={20}
                    color={theme.primary}
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
                <View className="px-2 py-1 rounded" style={{ backgroundColor: isDarkMode ? "#374151" : theme.border }}>
                  <Text className="text-xs" style={{ color: theme.secondary }}>
                    Locked
                  </Text>
                </View>
              </View>

              {/* Breed */}
              <View className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.border }}>
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${theme.primary}20` }}
                >
                  <MaterialCommunityIcons
                    name="paw"
                    size={20}
                    color={theme.primary}
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
                <View className="px-2 py-1 rounded" style={{ backgroundColor: isDarkMode ? "#374151" : theme.border }}>
                  <Text className="text-xs" style={{ color: theme.secondary }}>
                    Locked
                  </Text>
                </View>
              </View>

              {/* Date of Birth */}
              <View className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.border }}>
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${theme.primary}20` }}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.primary} />
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
                <View className="px-2 py-1 rounded" style={{ backgroundColor: isDarkMode ? "#374151" : theme.border }}>
                  <Text className="text-xs" style={{ color: theme.secondary }}>
                    Locked
                  </Text>
                </View>
              </View>

              {/* Gender */}
              <View className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.border }}>
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${theme.primary}20` }}
                >
                  <Ionicons name="person-outline" size={20} color={theme.primary} />
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
                <View className="px-2 py-1 rounded" style={{ backgroundColor: isDarkMode ? "#374151" : theme.border }}>
                  <Text className="text-xs" style={{ color: theme.secondary }}>
                    Locked
                  </Text>
                </View>
              </View>

              {/* Weight */}
              <View className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.border }}>
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${theme.primary}20` }}
                >
                  <MaterialCommunityIcons
                    name="scale-bathroom"
                    size={20}
                    color={theme.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.secondary }}>
                    Weight
                  </Text>
                  {isEditing ? (
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        className="flex-1 py-2 px-3 rounded-lg text-base font-medium"
                        style={{
                          backgroundColor: isDarkMode ? "#374151" : theme.border,
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
                            backgroundColor: weightUnit === "kg" ? theme.primary : (isDarkMode ? "#374151" : theme.border),
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
                            backgroundColor: weightUnit === "lbs" ? theme.primary : (isDarkMode ? "#374151" : theme.border),
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
                            backgroundColor: weightUnit === "kg" ? theme.primary : (isDarkMode ? "#374151" : theme.border),
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
                            backgroundColor: weightUnit === "lbs" ? theme.primary : (isDarkMode ? "#374151" : theme.border),
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
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${theme.primary}20` }}
                >
                  <MaterialCommunityIcons
                    name="brain"
                    size={20}
                    color={theme.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.secondary }}>
                    Color
                  </Text>
                  {isEditing ? (
                    <TextInput
                      className="py-2 px-3 rounded-lg text-base font-medium"
                      style={{
                        backgroundColor: isDarkMode ? "#374151" : theme.border,
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
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${theme.primary}20` }}
                >
                  <MaterialCommunityIcons
                    name="chip"
                    size={20}
                    color={theme.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.secondary }}>
                    Microchip Number
                  </Text>
                  <Text
                    className="text-base font-medium"
                    style={{ color: theme.foreground }}
                  >
                    {currentPet.microchip_number || "Not set"}
                  </Text>
                </View>
                <View className="px-2 py-1 rounded" style={{ backgroundColor: isDarkMode ? "#374151" : theme.border }}>
                  <Text className="text-xs" style={{ color: theme.secondary }}>
                    Locked
                  </Text>
                </View>
              </View>

              {/* Pet Passport Number */}
              <View className="flex-row items-center py-3 border-b" style={{ borderBottomColor: theme.border }}>
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${theme.primary}20` }}
                >
                  <MaterialCommunityIcons
                    name="chip"
                    size={20}
                    color={theme.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.secondary }}>
                    Pet Passport Number
                  </Text>
                  <Text
                    className="text-base font-medium"
                    style={{ color: theme.foreground }}
                  >
                    {(currentPet as any).pet_passport_number || "Not set"}
                  </Text>
                </View>
                <View className="px-2 py-1 rounded" style={{ backgroundColor: isDarkMode ? "#374151" : theme.border }}>
                  <Text className="text-xs" style={{ color: theme.secondary }}>
                    Locked
                  </Text>
                </View>
              </View>

              {/* Country */}
              <View className="flex-row items-center py-3">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${theme.primary}20` }}
                >
                  <Ionicons name="globe-outline" size={20} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.secondary }}>
                    Country
                  </Text>
                  <Text
                    className="text-base font-medium"
                    style={{ color: theme.foreground }}
                  >
                    {currentPet.country || "Not set"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Delete Pet Button */}
        {currentPet && (
          <View className="px-6 pb-4 pt-4 border-t" style={{ borderTopColor: theme.border }}>
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
                            // Select another pet if available
                            const remainingPets = pets.filter((p) => p.id !== currentPet.id);
                            if (remainingPets.length > 0) {
                              setSelectedPetId(remainingPets[0].id);
                            }
                          } else {
                            // No pets left, navigate back
                            router.back();
                          }
                        } catch (error: any) {
                          Alert.alert("Error", error.message || "Failed to delete pet");
                        }
                      },
                    },
                  ]
                );
              }}
              disabled={deletingPet || !currentPet}
              className="rounded-xl py-4 px-6 items-center justify-center active:opacity-70"
              style={{ 
                backgroundColor: deletingPet ? (isDarkMode ? "#374151" : theme.border) : theme.error,
                opacity: deletingPet || !currentPet ? 0.5 : 1,
              }}
            >
              <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>
                {deletingPet ? "Deleting..." : "Delete Pet"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Bottom Navigation */}
        <BottomNavBar activeTab="profile" />
      </View>
  );
}

