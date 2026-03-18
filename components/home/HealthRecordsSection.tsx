import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

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
  const isDark = mode === "dark";

  const isAndroid = Platform.OS === "android";
  const iconColor = isDark ? "#FFFFFF" : "#1D2433";
  const iconBg = isDark ? "rgba(255,255,255,0.06)" : "#EDEDEE";
  const iconBorderStyle = isAndroid
    ? {}
    : { borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" };
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF";
  const cardBorderStyle = isAndroid
    ? {}
    : { borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" };

  const records: RecordItem[] = [
    {
      id: "vaccines",
      label: "Vaccines",
      icon: <MaterialCommunityIcons name="needle" size={24} color={iconColor} />,
      route: `/(home)/health-record/${petId}/(tabs)/vaccinations`,
    },
    {
      id: "meds",
      label: "Meds",
      icon: <MaterialCommunityIcons name="pill" size={24} color={iconColor} />,
      route: `/(home)/health-record/${petId}/(tabs)/medications`,
    },
    {
      id: "exams",
      label: "Exams",
      icon: <MaterialCommunityIcons name="stethoscope" size={24} color={iconColor} />,
      route: `/(home)/health-record/${petId}/(tabs)/exams`,
    },
    {
      id: "lab",
      label: "Lab Results",
      icon: <Ionicons name="flask" size={24} color={iconColor} />,
      route: `/(home)/health-record/${petId}/(tabs)/lab-results`,
    },
  ];

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "500", color: isDark ? "#FFFFFF" : "#0D0F0F", lineHeight: 21.6, textTransform: "capitalize", marginBottom: 14 }}>
        Health Records
      </Text>

      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 20,
          paddingVertical: 20,
          paddingHorizontal: 12,
          ...cardBorderStyle,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {records.map((record) => (
            <TouchableOpacity
              key={record.id}
              style={{ alignItems: "center" }}
              onPress={() => router.push(record.route as any)}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: iconBg,
                  marginBottom: 8,
                  ...iconBorderStyle,
                }}
              >
                {record.icon}
              </View>
              <Text style={{ fontSize: 13, fontWeight: "500", color: theme.foreground }}>
                {record.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}
