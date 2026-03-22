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
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

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
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pets;
    return pets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.breed.toLowerCase().includes(q) ||
        p.animal_type.toLowerCase().includes(q)
    );
  }, [pets, query]);

  const subtitle = (p: Pet) => p.breed || p.animal_type;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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

        {filtered.map((pet) => {
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
            flexDirection: "row",
            alignItems: "center",
            marginVertical: 20,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
          <Text
            style={{
              marginHorizontal: 14,
              fontFamily: "Poppins_500Medium",
              fontSize: 14,
              color: theme.secondary,
            }}
          >
            Or
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
            paddingHorizontal: 14,
            marginBottom: 20,
          }}
        >
          <Ionicons name="search" size={20} color={theme.secondary} />
          <TextInput
            placeholder="Walk a different pet..."
            placeholderTextColor={theme.secondary}
            value={query}
            onChangeText={setQuery}
            style={{
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 10,
              fontFamily: "Poppins_500Medium",
              fontSize: 16,
              color: theme.foreground,
            }}
          />
        </View>

        <View
          style={{
            height: 200,
            borderRadius: 16,
            overflow: "hidden",
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
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.9)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </View>
          <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 18, color: "#FFFFFF" }}>
            Start Walk
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
