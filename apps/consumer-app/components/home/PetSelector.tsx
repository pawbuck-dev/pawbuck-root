import { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import PrivateImage from "@/components/common/PrivateImage";

type PetSelectorProps = {
  pets: Pet[];
  selectedPetId: string | null;
  onSelectPet: (petId: string) => void;
  notificationCounts?: Record<string, number>;
};

export default function PetSelector({
  pets,
  selectedPetId,
  onSelectPet,
  notificationCounts = {},
}: PetSelectorProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
    >
      {pets.map((pet) => {
        const isSelected = pet.id === selectedPetId;
        const count = notificationCounts[pet.id] || 0;

        return (
          <TouchableOpacity
            key={pet.id}
            onPress={() => onSelectPet(pet.id)}
            accessibilityRole="button"
            accessibilityLabel={`${pet.name}${isSelected ? ", selected" : ""}`}
            accessibilityHint={
              isSelected ? undefined : `Show ${pet.name}'s health records`
            }
            accessibilityState={{ selected: isSelected }}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 6,
              paddingLeft: 6,
              paddingRight: 14,
              borderRadius: 100,
              backgroundColor: isSelected
                ? theme.primary
                : isDark
                ? "rgba(255,255,255,0.08)"
                : "#FFFFFF",
              borderWidth: isSelected ? 0 : 1,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
            >
              {pet.photo_url ? (
                <PrivateImage
                  bucketName="pets"
                  filePath={pet.photo_url}
                  style={{ width: 32, height: 32 }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name="paw"
                  size={16}
                  color={isSelected ? "rgba(255,255,255,0.7)" : theme.secondary}
                />
              )}
            </View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: isSelected ? "#FFFFFF" : theme.foreground,
              }}
            >
              {pet.name}
            </Text>

            {count > 0 && (
              <View
                style={{
                  marginLeft: 6,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: isSelected ? "rgba(255,255,255,0.3)" : "#EF4444",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>
                  {count > 9 ? "9+" : count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
