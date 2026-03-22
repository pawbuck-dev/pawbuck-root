import type { MockNearbyVet } from "@/constants/mockVancouverVets";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

/** Figma-aligned clinic card (node ~1718-60649): icon + name, address, rating, Book Now pill. */
const COLORS = {
  light: {
    card: "#FFFFFF",
    border: "rgba(0,0,0,0.06)",
    title: "#000000",
    secondary: "#757575",
    iconCircle: "#E8E8E8",
    star: "#FFC107",
    bookBg: "#3BD0D2",
    bookText: "#FFFFFF",
    directions: "#2BA8AA",
  },
  dark: {
    card: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.08)",
    title: "#FFFFFF",
    secondary: "rgba(255,255,255,0.65)",
    iconCircle: "rgba(255,255,255,0.12)",
    star: "#FFC107",
    bookBg: "#3BD0D2",
    bookText: "#FFFFFF",
    directions: "#5FD9DB",
  },
};

export type VetClinicBookCardProps = {
  vet: MockNearbyVet;
  isDark: boolean;
  onBookNow: () => void;
  onDirections?: () => void;
  /** Wider horizontal padding when used as floating map card */
  compact?: boolean;
};

export function VetClinicBookCard({
  vet,
  isDark,
  onBookNow,
  onDirections,
  compact = false,
}: VetClinicBookCardProps) {
  const c = isDark ? COLORS.dark : COLORS.light;
  const shortAddress = vet.city.startsWith("Vancouver")
    ? `${vet.address}, Vancouver`
    : `${vet.address}, ${vet.city}`;

  return (
    <View
      style={{
        backgroundColor: c.card,
        borderRadius: 28,
        padding: compact ? 18 : 20,
        borderWidth: isDark ? 0 : 1,
        borderColor: c.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.25 : 0.08,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      <View className="flex-row items-center mb-4">
        <View
          className="rounded-full items-center justify-center mr-3"
          style={{
            width: 52,
            height: 52,
            backgroundColor: c.iconCircle,
          }}
        >
          <Ionicons name="medical-outline" size={26} color={isDark ? "#FFFFFF" : "#1A1A1A"} />
        </View>
        <Text
          className="flex-1 text-lg leading-6"
          style={{ fontFamily: "Poppins_600SemiBold", color: c.title }}
          numberOfLines={2}
        >
          {vet.name}
        </Text>
      </View>

      <View className="flex-row items-start mb-2">
        <Ionicons name="location-outline" size={18} color={c.secondary} style={{ marginTop: 2, marginRight: 8 }} />
        <Text
          className="flex-1 text-sm leading-5"
          style={{ fontFamily: "Poppins_400Regular", color: c.secondary }}
          numberOfLines={2}
        >
          {shortAddress}
        </Text>
      </View>

      <View className="flex-row items-center mb-5">
        <Ionicons name="star" size={18} color={c.star} style={{ marginRight: 6 }} />
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: c.title, fontSize: 15 }}>{vet.rating}</Text>
        <Text style={{ fontFamily: "Poppins_400Regular", color: c.secondary, fontSize: 14 }}>
          {" "}
          ({vet.reviewCount} reviews)
        </Text>
      </View>

      <Pressable
        onPress={onBookNow}
        className="py-3.5 px-6 rounded-full items-center justify-center active:opacity-85"
        style={{ backgroundColor: c.bookBg }}
      >
        <Text style={{ fontFamily: "Poppins_600SemiBold", color: c.bookText, fontSize: 16 }}>Book Now</Text>
      </Pressable>

      {onDirections ? (
        <Pressable onPress={onDirections} className="mt-3 py-2 items-center active:opacity-70">
          <Text style={{ fontFamily: "Poppins_500Medium", color: c.directions, fontSize: 14 }}>
            Get directions
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
