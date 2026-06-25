import PrivateImage from "@/components/common/PrivateImage";
import {
  HORIZONTAL_PILL_ROW_GAP,
  HORIZONTAL_PILL_ROW_PADDING_H,
  HorizontalPillChip,
} from "@/components/ui/HorizontalPillChip";
import { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView } from "react-native";

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
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: HORIZONTAL_PILL_ROW_PADDING_H,
        gap: HORIZONTAL_PILL_ROW_GAP,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {pets.map((pet) => {
        const isSelected = pet.id === selectedPetId;
        const count = notificationCounts[pet.id] || 0;

        return (
          <HorizontalPillChip
            key={pet.id}
            label={pet.name}
            selected={isSelected}
            badge={count}
            accessibilityLabel={`${pet.name}${isSelected ? ", selected" : ""}`}
            accessibilityHint={isSelected ? undefined : `Show ${pet.name}'s records`}
            onPress={() => onSelectPet(pet.id)}
            leading={
              pet.photo_url ? (
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
              )
            }
          />
        );
      })}
    </ScrollView>
  );
}
