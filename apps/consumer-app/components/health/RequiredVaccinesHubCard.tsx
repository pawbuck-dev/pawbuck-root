import { CompliantVaccineBanner } from "@/components/health/CompliantVaccineBanner";
import { ActionRequiredBanner } from "@/components/health/ActionRequiredBanner";
import { HEALTH_ELEVATION } from "@/constants/figmaHealthLayout";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { useVaccineCategories } from "@/hooks/useVaccineCategories";
import { petPossessiveLabel } from "@/utils/petCopy";
import { getRequiredVaccinesCompliantBody } from "@/utils/vaccinationUi";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { LayoutAnimation, Platform, Pressable, Text, TouchableOpacity, UIManager, View } from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const RED_BG = "rgba(239, 68, 68, 0.12)";
const RED_TEXT = "#DC2626";
const RED_ICON_BG = "rgba(239, 68, 68, 0.18)";

const GREEN_TEXT = "#1D9C3D";
const GREEN_BG = "rgba(29, 156, 61, 0.15)";
const GREEN_ICON_BG = "rgba(29, 156, 61, 0.18)";

type Props = {
  petId: string;
};

/**
 * Figma health hub (2033:133716) — Required Vaccines: compliant (Complaint.svg) or missing (ActionRequired) + expandable list when applicable.
 */
export default function RequiredVaccinesHubCard({ petId }: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const { pet } = useSelectedPet();
  const { requiredVaccinesStatus, isLoadingRequirements } = useVaccineCategories();
  const [expanded, setExpanded] = useState(false);

  const { total, administered, missing } = requiredVaccinesStatus;
  const hasRequiredModel = total > 0;
  const hasGaps = missing.length > 0;

  if (isLoadingRequirements || !hasRequiredModel) {
    return null;
  }

  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const borderStyle = isDark
    ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }
    : {};

  const cardShell = {
    backgroundColor: cardBg,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    ...borderStyle,
    ...(!isDark ? HEALTH_ELEVATION.cardLight : {}),
  } as const;

  const goVaccinations = () => router.push(`/(home)/health-record/${petId}/(tabs)/vaccinations` as any);

  if (!hasGaps) {
    return (
      <View style={cardShell}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: GREEN_ICON_BG,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="shield-checkmark" size={24} color={GREEN_TEXT} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>
                {petPossessiveLabel(pet?.name, "Required Vaccines")}
              </Text>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 100,
                  backgroundColor: GREEN_BG,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: GREEN_TEXT }}>Compliant</Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, color: theme.secondary, marginTop: 4 }}>
              {administered}/{total} vaccines completed
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          <CompliantVaccineBanner body={getRequiredVaccinesCompliantBody(pet?.country)} onCtaPress={goVaccinations} />
        </View>
      </View>
    );
  }

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  return (
    <View style={cardShell}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: RED_ICON_BG,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <MaterialCommunityIcons name="shield-alert" size={24} color={RED_TEXT} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>
              {petPossessiveLabel(pet?.name, "Required Vaccines")}
            </Text>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 100,
                backgroundColor: RED_BG,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: RED_TEXT }}>Missing</Text>
            </View>
          </View>
          <Text style={{ fontSize: 14, color: theme.secondary, marginTop: 4 }}>
            {administered}/{total} vaccines completed
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        <ActionRequiredBanner
          body={`Your pet is missing vaccines required by ${
            pet?.country === "Canada"
              ? "Canadian"
              : pet?.country === "United Kingdom"
                ? "U.K."
                : "U.S."
          } regulations. Ensure your pet stays protected and compliant.`}
        />
      </View>

      <Pressable
        onPress={toggleExpand}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 14,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="information-circle-outline" size={20} color={theme.secondary} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground }}>
            {missing.length} Missing Required Vaccine{missing.length === 1 ? "" : "s"}
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={22} color={theme.secondary} />
      </Pressable>

      {expanded && (
        <View style={{ marginTop: 12, gap: 8 }}>
          {missing.map((m) => (
            <View
              key={m.canonical_key}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground }}>{m.vaccine_name}</Text>
              {m.description ? (
                <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 4 }}>{m.description}</Text>
              ) : null}
            </View>
          ))}
          <TouchableOpacity onPress={goVaccinations} activeOpacity={0.85}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.primary, marginTop: 4 }}>
              View in Vaccinations →
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
