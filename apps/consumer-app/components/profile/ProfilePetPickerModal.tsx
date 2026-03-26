import type { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";

type ProfilePetPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  pets: Pet[];
  selectedPetId: string | null;
  onSelectPet: (petId: string) => void;
};

export function ProfilePetPickerModal({
  visible,
  onClose,
  pets,
  selectedPetId,
  onSelectPet,
}: ProfilePetPickerModalProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: theme.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: 28,
            paddingTop: 12,
            maxHeight: "50%",
          }}
        >
          <Text className="text-center text-base font-semibold mb-3" style={{ color: theme.foreground }}>
            Select pet
          </Text>
          <ScrollView>
            {pets.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => onSelectPet(p.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  backgroundColor: selectedPetId === p.id ? `${theme.primary}18` : "transparent",
                }}
              >
                <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: "600" }}>{p.name}</Text>
                {selectedPetId === p.id && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} style={{ marginLeft: "auto" }} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
