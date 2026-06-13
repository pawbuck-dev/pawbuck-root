import { StartWalkWalkerIcon } from "@/components/pawthon/StartWalkWalkerIcon";
import type { Pet } from "@/context/petsContext";
import {
  PAWTHON_PLACEHOLDER_STRIPE_A,
  PAWTHON_PLACEHOLDER_STRIPE_B,
  PAWTHON_TEAL,
} from "@/constants/pawthonUi";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type Props = {
  pets: Pet[];
  selectedPetId: string | null;
  onSelectPetId: (id: string) => void;
  onStartWalk: () => void;
  /** Optional map preview (single point path). */
  mapPreview?: React.ReactNode;
};

export function PawthonPetSelect({
  pets,
  selectedPetId,
  onSelectPetId,
  onStartWalk,
  mapPreview,
}: Props) {
  const { theme } = useTheme();
  const subtitle = (p: Pet) => p.breed || p.animal_type;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontFamily: "Poppins_700Bold",
            fontSize: 22,
            color: theme.foreground,
            marginBottom: 16,
            marginTop: 4,
          }}
        >
          Select Your Pet
        </Text>

        {pets.map((pet) => {
          const selected = pet.id === selectedPetId;
          return (
            <Pressable
              key={pet.id}
              onPress={() => onSelectPetId(pet.id)}
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
                  <Image source={{ uri: pet.photo_url }} style={{ width: 52, height: 52 }} />
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
              {selected && (
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: PAWTHON_TEAL,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                </View>
              )}
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
          <StartWalkWalkerIcon size={40} accessibilityLabel="Start a walk" />
          <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 18, color: "#FFFFFF", marginLeft: 10 }}>
            Start a Walk
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
