import { DomainCategoryIconWell } from "@/components/ui/IconWell";
import type { DomainCategoryId } from "@/constants/iconTierTokens";
import { useTheme } from "@/context/themeContext";
import { buildPetCareNudges, careNudgeToCatchUpCard } from "@/services/careNudges/fromPetRecords";
import { Tables } from "@/database.types";
import { MedicineData } from "@/types/medication";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
  domainCategory: DomainCategoryId;
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
    const nudges = buildPetCareNudges({
      petId,
      vaccinations,
      medicines,
      petCountry,
    })
      .filter((n) => n.kind === "vac_due_soon" || n.kind === "med_due_today")
      .slice(0, 5);

    return nudges.map(careNudgeToCatchUpCard);
  }, [vaccinations, medicines, petId, petCountry]);

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
        <DomainCategoryIconWell category={item.domainCategory} size="md" />
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
        <Text style={{ fontSize: 14, fontWeight: "600", color: theme.primary }}>View details</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.primary} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={{ marginBottom: 16 }}>
      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + CARD_HORIZONTAL_MARGIN * 2}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const offset = e.nativeEvent.contentOffset.x;
          const index = Math.round(offset / (cardWidth + CARD_HORIZONTAL_MARGIN * 2));
          setActiveIndex(index);
        }}
      />
      {cards.length > 1 ? (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 }}>
          {cards.map((card, index) => (
            <View
              key={card.id}
              style={{
                width: index === activeIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  index === activeIndex ? theme.primary : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
