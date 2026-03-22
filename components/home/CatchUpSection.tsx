import {
  FIGMA_HEALTH_MEDS_ICON_BG,
  FIGMA_HEALTH_TEAL,
} from "@/constants/figmaHealthLayout";
import { useTheme } from "@/context/themeContext";
import { Tables } from "@/database.types";
import { MedicineData } from "@/models/medication";
import { getVaccinationAlertPeriod } from "@/utils/vaccinationAlertPeriods";
import { getNextMedicationDose } from "@/utils/medication";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import moment from "moment";
import React, { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";

type CatchUpSectionProps = {
  petId: string;
  vaccinations: Tables<"vaccinations">[];
  medicines: MedicineData[];
  petCountry?: string | null;
};

type CatchUpCard = {
  id: string;
  type: "vaccination" | "medication";
  title: string;
  subtitle: string;
  iconName: string;
  iconColor: string;
  iconBg: string;
  route: string;
};

const CARD_HORIZONTAL_MARGIN = 20;

export default function CatchUpSection({
  petId,
  vaccinations,
  medicines,
  petCountry,
}: CatchUpSectionProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const [activeIndex, setActiveIndex] = useState(0);
  const screenWidth = Dimensions.get("window").width;
  const cardWidth = screenWidth - CARD_HORIZONTAL_MARGIN * 2;

  const cards = useMemo(() => {
    const items: CatchUpCard[] = [];
    const now = moment();

    vaccinations
      .filter((vac) => {
        if (!vac.next_due_date) return false;
        const dueDate = moment(vac.next_due_date);
        const alertPeriodMonths = getVaccinationAlertPeriod(vac.name, petCountry);
        const alertPeriodDays = alertPeriodMonths * 30;
        return dueDate.isAfter(now) && dueDate.diff(now, "days") <= alertPeriodDays;
      })
      .sort((a, b) => moment(a.next_due_date!).diff(moment(b.next_due_date!)))
      .slice(0, 3)
      .forEach((vac) => {
        const daysLeft = moment(vac.next_due_date!).diff(now, "days");
        items.push({
          id: `vac-${vac.id}`,
          type: "vaccination",
          title: `${vac.name} Due`,
          subtitle:
            daysLeft <= 7
              ? `Due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Schedule with your vet.`
              : `Due in ${daysLeft} days. Tap to view details.`,
          iconName: "heart-pulse",
          iconColor: "#FFFFFF",
          iconBg: FIGMA_HEALTH_TEAL,
          iconPlateRadius: 20,
          route: `/(home)/health-record/${petId}/(tabs)/vaccinations`,
        });
      });

    medicines.forEach((med) => {
      const nextDose = getNextMedicationDose(med);
      if (nextDose && moment(nextDose).isSame(now, "day")) {
        items.push({
          id: `med-${med.id}`,
          type: "medication",
          title: `${med.name} Due`,
          subtitle: "Tap to view and schedule with your vet.",
          iconName: "pill",
          iconColor: "#FFFFFF",
          iconBg: FIGMA_HEALTH_MEDS_ICON_BG,
          iconPlateRadius: 20,
          route: `/(home)/health-record/${petId}/(tabs)/medications`,
        });
      }
    });

    return items;
  }, [vaccinations, medicines, petId, petCountry, isDark]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  if (cards.length === 0) return null;

  const renderCard = ({ item }: { item: CatchUpCard }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        try {
          router.push(item.route as any);
        } catch {}
      }}
      style={{
        width: cardWidth,
        marginHorizontal: CARD_HORIZONTAL_MARGIN,
        borderRadius: 20,
        padding: 16,
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: item.iconPlateRadius ?? 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: item.iconBg,
          }}
        >
          <MaterialCommunityIcons name={item.iconName as any} size={22} color={item.iconColor} />
        </View>
        <TouchableOpacity
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
          }}
        >
          <Ionicons name="close" size={16} color={theme.secondary} />
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground, marginBottom: 4 }}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 13, color: theme.secondary, lineHeight: 18 }}>
          {item.subtitle}
        </Text>
      </View>

      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}
        onPress={() => {
          try {
            router.push(item.route as any);
          } catch {}
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: theme.primary }}>View</Text>
        <Ionicons name="open-outline" size={14} color={theme.primary} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: theme.foreground,
          marginBottom: 12,
          paddingHorizontal: 20,
        }}
      >
        Catch Up
      </Text>

      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        snapToInterval={screenWidth}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {cards.length > 1 && (
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 12, gap: 6 }}>
          {cards.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === activeIndex ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === activeIndex ? theme.primary : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
