import { useTheme } from "@/context/themeContext";
import { Tables } from "@/database.types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

type VetInfo = Tables<"vet_information">;

type CareTeamMember = {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  icon: "medkit-outline" | "paw-outline" | "fitness-outline" | "person-outline";
};

type MyCareTeamSectionProps = {
  vetInfo?: VetInfo | null;
  onAddVet: () => void;
  /** Additional care team members (dog walkers, groomers, etc.) */
  additionalMembers?: CareTeamMember[];
};

export default function MyCareTeamSection({
  vetInfo,
  onAddVet,
  additionalMembers = [],
}: MyCareTeamSectionProps) {
  const { theme } = useTheme();

  const handleCall = async (phone?: string) => {
    if (!phone) return;

    const phoneUrl = `tel:${phone}`;
    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert("Phone", `Phone: ${phone}`, [{ text: "OK", style: "cancel" }]);
      }
    } catch (error) {
      Alert.alert("Phone", `Phone: ${phone}`, [{ text: "OK", style: "cancel" }]);
    }
  };

  const handleMessage = async (phone?: string) => {
    if (!phone) return;

    const smsUrl = `sms:${phone}`;
    try {
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);
      } else {
        Alert.alert("Message", `Phone: ${phone}`, [{ text: "OK", style: "cancel" }]);
      }
    } catch (error) {
      Alert.alert("Message", `Phone: ${phone}`, [{ text: "OK", style: "cancel" }]);
    }
  };

  // Build the care team list
  const careTeam: CareTeamMember[] = [];

  if (vetInfo) {
    careTeam.push({
      id: "vet",
      name: vetInfo.vet_name,
      role: "Veterinarian",
      phone: vetInfo.phone,
      email: vetInfo.email,
      icon: "medkit-outline",
    });
  }

  careTeam.push(...additionalMembers);

  return (
    <View className="px-4">
      {/* Section Header */}
      <View className="mb-4">
        <Text
          className="text-xl font-bold mb-2"
          style={{ color: theme.foreground }}
        >
          My Care Team
        </Text>
        <LinearGradient
          colors={[theme.primary, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: 80,
            height: 3,
            borderRadius: 2,
          }}
        />
      </View>

      {/* Care Team Members */}
      <View className="gap-3">
        {careTeam.map((member) => (
          <View
            key={member.id}
            className="flex-row items-center rounded-2xl p-4"
            style={{
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            {/* Icon */}
            <View
              className="w-12 h-12 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Ionicons name={member.icon} size={22} color={theme.primary} />
            </View>

            {/* Info */}
            <View className="flex-1">
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
              >
                {member.name}
              </Text>
              <Text className="text-sm" style={{ color: theme.secondary }}>
                {member.role}
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-2">
              {member.phone && (
                <TouchableOpacity
                  onPress={() => handleCall(member.phone)}
                  className="w-11 h-11 rounded-full items-center justify-center"
                  style={{ backgroundColor: theme.primary }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={18} color="#fff" />
                </TouchableOpacity>
              )}
              {member.phone && (
                <TouchableOpacity
                  onPress={() => handleMessage(member.phone)}
                  className="w-11 h-11 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: "transparent",
                    borderWidth: 1,
                    borderColor: theme.primary,
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-outline" size={18} color={theme.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {/* Add Vet Card (if no vet) */}
        {!vetInfo && (
          <TouchableOpacity
            onPress={onAddVet}
            className="flex-row items-center rounded-2xl p-4"
            style={{
              backgroundColor: theme.card,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: theme.border,
            }}
            activeOpacity={0.7}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Ionicons name="add" size={24} color={theme.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
              >
                Add Veterinarian
              </Text>
              <Text className="text-sm" style={{ color: theme.secondary }}>
                Add your vet's contact details
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

