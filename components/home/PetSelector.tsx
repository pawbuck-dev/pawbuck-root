import { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import PrivateImage from "../PrivateImage";

type PetSelectorProps = {
  pets: Pet[];
  selectedPetId: string | null;
  onSelectPet: (petId: string) => void;
  /** Map of pet IDs to notification counts */
  notificationCounts?: Record<string, number>;
};

export default function PetSelector({
  pets,
  selectedPetId,
  onSelectPet,
  notificationCounts = {},
}: PetSelectorProps) {
  const { theme } = useTheme();
  const router = useRouter();

  const handleAddPet = () => {
    router.push("/onboarding/step1");
  };

  // Get badge color based on index
  const getBadgeColor = (index: number) => {
    const colors = ["#EAB308", "#3B82F6", "#EF4444", "#22C55E", "#A855F7"];
    return colors[index % colors.length];
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 8, gap: 0 }}
    >
      {pets.map((pet, index) => {
        const isSelected = pet.id === selectedPetId;
        const notificationCount = notificationCounts[pet.id] || 0;

        return (
          <TouchableOpacity
            key={pet.id}
            onPress={() => onSelectPet(pet.id)}
            activeOpacity={0.7}
            className="items-center"
          >
            {/* Fixed size wrapper for consistent alignment */}
            <View className="w-[76px] h-[84px] items-center justify-center">
              {/* Avatar Container */}
              <View
                className="relative"
                style={{
                  padding: 4,
                  borderRadius: 50,
                  borderWidth: isSelected ? 3 : 2,
                  borderColor: isSelected ? theme.primary : "transparent",
                  // Glow effect for selected pet
                  ...(isSelected && {
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 10,
                    elevation: 8,
                  }),
                }}
              >
                {/* Pet Avatar */}
                <View
                  className="w-16 h-16 rounded-full overflow-hidden items-center justify-center"
                  style={{
                    backgroundColor: theme.card,
                  }}
                >
                  {pet.photo_url ? (
                    <PrivateImage
                      bucketName="pets"
                      filePath={pet.photo_url}
                      className="w-16 h-16"
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="paw" size={28} color={theme.secondary} />
                  )}
                </View>

                {/* Notification Badge */}
                {notificationCount > 0 && (
                  <View
                    className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full items-center justify-center px-1"
                    style={{ backgroundColor: getBadgeColor(index) }}
                  >
                    <Text className="text-xs font-bold text-white">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </Text>
                  </View>
                )}

                {/* Selected Indicator Dot - on the ring */}
                {isSelected && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: -7,
                      left: "50%",
                      marginLeft: -3,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: theme.primary,
                    }}
                  />
                )}
              </View>
            </View>

            {/* Pet Name */}
            <Text
              className="text-sm font-medium"
              style={{
                color: isSelected ? theme.primary : theme.foreground,
              }}
            >
              {pet.name}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Add Pet Button */}
      <TouchableOpacity
        onPress={handleAddPet}
        activeOpacity={0.7}
        className="items-center"
      >
        {/* Fixed size wrapper for consistent alignment */}
        <View className="w-[76px] h-[84px] items-center justify-center">
          <View
            className="w-14 h-14 rounded-full items-center justify-center"
            style={{
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: theme.primary,
            }}
          >
            <Ionicons name="add" size={28} color={theme.primary} />
          </View>
        </View>
        <Text
          className="text-sm font-medium"
          style={{ color: theme.secondary }}
        >
          Add
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

