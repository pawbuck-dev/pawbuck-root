import { StartWalkWalkerIcon } from "@/components/pawthon/StartWalkWalkerIcon";
import type { Pet } from "@/context/petsContext";
import {
  PAWTHON_PLACEHOLDER_STRIPE_A,
  PAWTHON_PLACEHOLDER_STRIPE_B,
  PAWTHON_TEAL,
} from "@/constants/pawthonUi";
import { useTheme } from "@/context/themeContext";
import { formatStartWalkCta, toggleWalkPetId } from "@/utils/pawthonWalkPets";
import { Ionicons } from "@expo/vector-icons";
import PrivateImage from "@/components/common/PrivateImage";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type Props = {
  pets: Pet[];
  selectedPetIds: string[];
  onTogglePetId: (id: string) => void;
  onSelectAll?: () => void;
  onStartWalk: () => void;
  /** Optional map preview (single point path). */
  mapPreview?: React.ReactNode;
};

export function PawthonPetSelect({
  pets,
  selectedPetIds,
  onTogglePetId,
  onSelectAll,
  onStartWalk,
  mapPreview,
}: Props) {
  const { theme } = useTheme();
  const subtitle = (p: Pet) => p.breed || p.animal_type;

  const selectedPets = useMemo(
    () => pets.filter((p) => selectedPetIds.includes(p.id)),
    [pets, selectedPetIds]
  );
  const startLabel = formatStartWalkCta(selectedPets);
  const showSelectAll = pets.length > 1 && pets.length <= 4 && onSelectAll;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            marginTop: 4,
          }}
        >
          <Text
            style={{
              fontFamily: "Poppins_700Bold",
              fontSize: 22,
              color: theme.foreground,
              flex: 1,
            }}
          >
            Who&apos;s coming?
          </Text>
          {showSelectAll ? (
            <Pressable
              onPress={onSelectAll}
              hitSlop={8}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: PAWTHON_TEAL,
              }}
            >
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: PAWTHON_TEAL }}>
                Select all
              </Text>
            </Pressable>
          ) : null}
        </View>

        {pets.map((pet) => {
          const selected = selectedPetIds.includes(pet.id);
          return (
            <Pressable
              key={pet.id}
              onPress={() => onTogglePetId(pet.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 16,
                marginBottom: 12,
                backgroundColor: theme.card,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? PAWTHON_TEAL : theme.border,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  overflow: "hidden",
                  backgroundColor: theme.border,
                  marginRight: 14,
                }}
              >
                {pet.photo_url ? (
                  <PrivateImage
                    bucketName="pets"
                    filePath={pet.photo_url}
                    style={{ width: 52, height: 52 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="paw" size={28} color={theme.secondary} />
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Poppins_700Bold",
                    fontSize: 17,
                    color: theme.foreground,
                  }}
                >
                  {pet.name}
                </Text>
                <Text
                  style={{
                    fontFamily: "Poppins_500Medium",
                    fontSize: 14,
                    color: theme.secondary,
                    marginTop: 2,
                  }}
                >
                  {subtitle(pet)}
                </Text>
              </View>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: selected ? PAWTHON_TEAL : "transparent",
                  borderWidth: selected ? 0 : 2,
                  borderColor: theme.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {selected ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
              </View>
            </Pressable>
          );
        })}

        <View
          style={{
            height: 200,
            borderRadius: 16,
            overflow: "hidden",
            marginTop: 8,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          {mapPreview ?? (
            <View style={{ flex: 1 }}>
              <LinearGradient
                colors={[PAWTHON_PLACEHOLDER_STRIPE_A, PAWTHON_PLACEHOLDER_STRIPE_B]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  ...({ position: "absolute" } as const),
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
              />
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    width: 2,
                    top: 24,
                    bottom: 24,
                    backgroundColor: PAWTHON_TEAL,
                    opacity: 0.5,
                  }}
                />
                <View
                  style={{
                    backgroundColor: PAWTHON_TEAL,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontFamily: "Poppins_700Bold", color: "#FFF", fontSize: 14 }}>
                    GPS
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable onPress={onStartWalk} style={{ marginTop: 8 }}>
        <LinearGradient
          colors={[PAWTHON_TEAL, PAWTHON_TEAL]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 16,
            borderRadius: 28,
          }}
        >
          <StartWalkWalkerIcon size={40} accessibilityLabel={startLabel} />
          <Text
            style={{
              fontFamily: "Poppins_700Bold",
              fontSize: 18,
              color: "#FFFFFF",
              marginLeft: 10,
              flexShrink: 1,
            }}
            numberOfLines={2}
          >
            {startLabel}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

/** Helper for parent screens toggling pet selection. */
export { toggleWalkPetId };
