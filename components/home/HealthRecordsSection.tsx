import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type HealthRecordsSectionProps = {
  petId: string;
};

type RecordItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  route: string;
};

export default function HealthRecordsSection({ petId }: HealthRecordsSectionProps) {
  const { theme, mode } = useTheme();
  const router = useRouter();

  // Icon colors matching the screenshot:
  // Exams: Teal (#3BD0D2), Lab Results: Purple (#A855F7)
  const iconColors = {
    vaccines: mode === "dark" ? "#3BD0D2" : "#2BA3A3", // Teal for vaccines
    meds: "#hsl(25, 90%, 55%)", // Teal for meds
    exams: "#hsl(200, 85%, 55%)", // Teal for exams (stethoscope) - matches screenshot
    lab: "#A855F7", // Purple for lab results (flask) - matches screenshot
  };

  const records: RecordItem[] = [
    {
      id: "vaccines",
      label: "Vaccines",
      icon: <MaterialCommunityIcons name="needle" size={26} color={iconColors.vaccines} />,
      route: `/(home)/health-record/${petId}/(tabs)/vaccinations`,
    },
    {
      id: "meds",
      label: "Meds",
      icon: <MaterialCommunityIcons name="pill" size={26} color={iconColors.meds} />,
      route: `/(home)/health-record/${petId}/(tabs)/medications`,
    },
    {
      id: "exams",
      label: "Exams",
      icon: <MaterialCommunityIcons name="stethoscope" size={26} color={iconColors.exams} />, // Teal stethoscope icon
      route: `/(home)/health-record/${petId}/(tabs)/exams`,
    },
    {
      id: "lab",
      label: "Lab Results",
      icon: <Ionicons name="flask" size={26} color={iconColors.lab} />, // Purple flask icon
      route: `/(home)/health-record/${petId}/(tabs)/lab-results`,
    },
  ];

  return (
    <View className="px-4">
      {/* Section Header */}
      <View className="mb-4">
        <Text
          className="text-xl font-bold mb-2"
          style={{ color: theme.foreground }}
        >
          Health Records
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

      {/* Record Buttons Grid */}
      <View className="flex-row justify-between">
        {records.map((record) => (
          <TouchableOpacity
            key={record.id}
            className="items-center"
            onPress={() => router.push(record.route as any)}
            activeOpacity={0.7}
          >
            <View
              className="w-[72px] h-[72px] rounded-2xl items-center justify-center mb-2"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              {record.icon}
            </View>
            <Text
              className="text-xs font-medium"
              style={{ color: theme.foreground }}
            >
              {record.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

