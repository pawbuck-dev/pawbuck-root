import { useTheme } from "@/context/themeContext";
import { RequiredVaccinesStatus } from "@/hooks/useVaccineCategories";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { LayoutAnimation, Platform, Text, TouchableOpacity, UIManager, View } from "react-native";

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface VaccinationStatusHeaderProps {
  status: RequiredVaccinesStatus;
  country?: string;
}

/**
 * Get status color based on administered vs total vaccines
 */
const getStatusColor = (
  administered: number,
  total: number
): { color: string; bgColor: string; label: string } => {
  if (administered === total) {
    return {
      color: "#10B981", // green-500
      bgColor: "rgba(16, 185, 129, 0.15)",
      label: "Fully Vaccinated",
    };
  } else if (administered > 0) {
    return {
      color: "#F59E0B", // amber-500
      bgColor: "rgba(245, 158, 11, 0.15)",
      label: "Partially Vaccinated",
    };
  } else {
    return {
      color: "#EF4444", // red-500
      bgColor: "rgba(239, 68, 68, 0.15)",
      label: "Missing Vaccines",
    };
  }
};

export const VaccinationStatusHeader: React.FC<VaccinationStatusHeaderProps> = ({
  status,
  country,
}) => {
  const { theme } = useTheme();
  const [showMissing, setShowMissing] = useState(false);

  const { color, bgColor, label } = getStatusColor(status.administered, status.total);
  const isFullyVaccinated = status.administered === status.total;

  const toggleMissing = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowMissing(!showMissing);
  };

  // Don't show if there are no required vaccines for this country/animal
  if (status.total === 0) {
    return null;
  }

  return (
    <View
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: theme.card }}
    >
      {/* Main Status Section */}
      <View className="p-4">
        {/* Header Row */}
        <View className="flex-row items-center">
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: bgColor }}
          >
            <Ionicons
              name={isFullyVaccinated ? "shield-checkmark" : "shield-half"}
              size={20}
              color={color}
            />
          </View>
          <View className="flex-1">
            <Text
              className="text-base font-semibold"
              style={{ color: theme.foreground }}
            >
              Vaccination Status
            </Text>
            <Text
              className="text-sm font-medium"
              style={{ color }}
            >
              {label}
            </Text>
          </View>
        </View>

        {/* Status Text */}
        <Text
          className="text-sm mt-3"
          style={{ color: theme.secondary }}
        >
          <Text style={{ fontWeight: "600", color: theme.foreground }}>
            {status.administered}
          </Text>
          {" of "}
          <Text style={{ fontWeight: "600", color: theme.foreground }}>
            {status.total}
          </Text>
          {" required vaccines administered"}
        </Text>

        {/* Compliance Message for Fully Vaccinated Pets */}
        {isFullyVaccinated && country && (
          <View
            className="mt-3 p-3 rounded-xl"
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              borderWidth: 1,
              borderColor: "rgba(16, 185, 129, 0.3)",
            }}
          >
            <View className="flex-row items-start">
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#10B981"
                style={{ marginTop: 1, marginRight: 8 }}
              />
              <View className="flex-1">
                <Text
                  className="text-sm font-medium"
                  style={{ color: "#10B981" }}
                >
                  Compliant
                </Text>
                <Text
                  className="text-xs mt-1"
                  style={{ color: theme.secondary }}
                >
                  {country === "United States"
                    ? "Your pet meets all vaccination requirements mandated by U.S. state and federal regulations. Keep up the great work protecting your furry friend!"
                    : country === "Canada"
                    ? "Your pet meets all vaccination requirements under Canadian provincial and federal guidelines. Great job keeping your companion protected!"
                    : `Your pet is fully vaccinated according to ${country} regulations. Excellent care for your pet!`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Non-Compliance Message for Pets with Missing Vaccines */}
        {!isFullyVaccinated && country && (
          <View
            className="mt-3 p-3 rounded-xl"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              borderWidth: 1,
              borderColor: "rgba(239, 68, 68, 0.3)",
            }}
          >
            <View className="flex-row items-start">
              <Ionicons
                name="alert-circle"
                size={18}
                color="#EF4444"
                style={{ marginTop: 1, marginRight: 8 }}
              />
              <View className="flex-1">
                <Text
                  className="text-sm font-medium"
                  style={{ color: "#EF4444" }}
                >
                  Action Needed
                </Text>
                <Text
                  className="text-xs mt-1"
                  style={{ color: theme.secondary }}
                >
                  {country === "United States"
                    ? "Your pet is missing vaccines required by U.S. regulations. Schedule a vet visit to ensure your pet stays protected and compliant."
                    : country === "Canada"
                    ? "Your pet is missing vaccines required under Canadian guidelines. Contact your veterinarian to get your pet up to date."
                    : `Your pet is missing vaccines required in ${country}. Please consult your veterinarian to complete the vaccination schedule and keep your pet protected.`}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Missing Vaccines Section (Expandable) */}
      {status.missing.length > 0 && (
        <>
          {/* Divider */}
          <View className="h-px" style={{ backgroundColor: theme.border }} />

          {/* Toggle Button */}
          <TouchableOpacity
            onPress={toggleMissing}
            activeOpacity={0.7}
            className="flex-row items-center justify-between px-4 py-3"
          >
            <View className="flex-row items-center">
              <Ionicons
                name="alert-circle"
                size={18}
                color="#EF4444"
              />
              <Text
                className="text-sm font-medium ml-2"
                style={{ color: theme.foreground }}
              >
                {status.missing.length} missing required vaccine{status.missing.length > 1 ? "s" : ""}
              </Text>
            </View>
            <Ionicons
              name={showMissing ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.secondary}
            />
          </TouchableOpacity>

          {/* Missing Vaccines List */}
          {showMissing && (
            <View className="px-4 pb-4">
              {status.missing.map((vaccine, index) => (
                <View
                  key={vaccine.id}
                  className="flex-row items-start py-2"
                  style={{
                    borderTopWidth: index > 0 ? 1 : 0,
                    borderTopColor: theme.border,
                  }}
                >
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center mt-0.5 mr-3"
                    style={{ backgroundColor: "rgba(239, 68, 68, 0.15)" }}
                  >
                    <Ionicons name="close" size={14} color="#EF4444" />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm font-medium"
                      style={{ color: theme.foreground }}
                    >
                      {vaccine.vaccine_name}
                    </Text>
                    {vaccine.description && (
                      <Text
                        className="text-xs mt-0.5"
                        style={{ color: theme.secondary }}
                        numberOfLines={2}
                      >
                        {vaccine.description}
                      </Text>
                    )}
                    {vaccine.frequency_months && (
                      <Text
                        className="text-xs mt-1"
                        style={{ color: theme.primary }}
                      >
                        Recommended every {vaccine.frequency_months} months
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
};
