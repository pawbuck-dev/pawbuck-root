import { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface PetInformationCardProps {
  pet: Pet;
  onEdit?: () => void;
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "Not set";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const convertWeight = (value: number, fromUnit: string, toUnit: string): number => {
  if (fromUnit === toUnit) return value;
  
  // Convert to kg first, then to target unit
  const kg = fromUnit === "kg" ? value : value * 0.453592;
  return toUnit === "kg" ? kg : kg * 2.20462;
};

const formatWeight = (value: number): string => {
  return Math.round(value).toString();
};

function storageUnitToToggle(u: string | null | undefined): "kg" | "lbs" {
  if (u === "kilograms" || u === "kg") return "kg";
  return "lbs";
}

export default function PetInformationCard({ pet, onEdit }: PetInformationCardProps) {
  const { theme } = useTheme();
  const hasWeight = pet.weight_value != null && pet.weight_unit != null;
  const petStorageUnit = storageUnitToToggle(pet.weight_unit);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">(petStorageUnit);

  const displayWeight =
    !hasWeight
      ? null
      : weightUnit === petStorageUnit
        ? pet.weight_value!
        : convertWeight(
            pet.weight_value!,
            petStorageUnit === "kg" ? "kg" : "lbs",
            weightUnit
          );

  const InformationRow = ({
    icon,
    label,
    value,
    locked = false,
    editable = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    locked?: boolean;
    editable?: boolean;
  }) => (
    <View
      className="flex-row items-center justify-between py-4"
      style={{
        borderBottomWidth: 1,
        borderBottomColor: theme.border + "40",
      }}
    >
      <View className="flex-row items-center flex-1">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: `${theme.primary}20` }}
        >
          <Ionicons name={icon} size={20} color={theme.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-sm" style={{ color: theme.secondary }}>
            {label}
          </Text>
          <Text className="text-base font-medium mt-0.5" style={{ color: theme.foreground }}>
            {value}
          </Text>
        </View>
      </View>
      {locked && (
        <View
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: theme.border + "40" }}
        >
          <Text className="text-xs" style={{ color: theme.secondary }}>
            Locked
          </Text>
        </View>
      )}
      {editable && !locked && onEdit && (
        <TouchableOpacity onPress={onEdit}>
          <Ionicons name="pencil-outline" size={20} color={theme.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View>
      {/* Date of Birth */}
      <InformationRow
        icon="calendar-outline"
        label="Date of Birth"
        value={formatDate(pet.date_of_birth)}
        locked={true}
      />

      {/* Gender */}
      <InformationRow
        icon="person-outline"
        label="Gender"
        value={pet.sex.charAt(0).toUpperCase() + pet.sex.slice(1)}
        locked={true}
      />

      {/* Weight with unit toggle */}
      <View
        className="flex-row items-center justify-between py-4"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: theme.border + "40",
        }}
      >
        <View className="flex-row items-center flex-1">
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: `${theme.primary}20` }}
          >
            <Ionicons name="barbell-outline" size={20} color={theme.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-sm" style={{ color: theme.secondary }}>
              Weight
            </Text>
            <Text className="text-base font-medium mt-0.5" style={{ color: theme.foreground }}>
              {displayWeight == null ? "Not set" : `${formatWeight(displayWeight)} ${weightUnit}`}
            </Text>
          </View>
        </View>
        {hasWeight ? (
          <View className="flex-row rounded-full overflow-hidden" style={{ borderWidth: 1, borderColor: theme.border }}>
            <TouchableOpacity
              onPress={() => setWeightUnit("kg")}
              className="px-4 py-2"
              style={{
                backgroundColor: weightUnit === "kg" ? theme.primary : "transparent",
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  color: weightUnit === "kg" ? theme.primaryForeground : theme.foreground,
                }}
              >
                kg
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setWeightUnit("lbs")}
              className="px-4 py-2"
              style={{
                backgroundColor: weightUnit === "lbs" ? theme.primary : "transparent",
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  color: weightUnit === "lbs" ? theme.primaryForeground : theme.foreground,
                }}
              >
                lbs
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Color */}
      <InformationRow
        icon="color-palette-outline"
        label="Color"
        value={pet.color || "Not set"}
        editable={true}
      />

      {/* Microchip Number */}
      <InformationRow
        icon="hardware-chip-outline"
        label="Microchip Number"
        value={pet.microchip_number || "Not set"}
        locked={true}
      />

      {/* Country */}
      <InformationRow
        icon="globe-outline"
        label="Country"
        value={pet.country}
        editable={true}
      />
    </View>
  );
}

