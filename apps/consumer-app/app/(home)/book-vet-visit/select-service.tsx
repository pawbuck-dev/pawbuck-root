import { BookingFlowHeader, type BookingViewMode } from "@/components/booking/BookingFlowHeader";
import BottomNavBar from "@/components/home/BottomNavBar";
import {
  VET_BOOKING_SERVICES_CATALOG,
  type VetBookingServiceId,
} from "@/constants/vetBookingServices";
import { useTheme } from "@/context/themeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState, type ComponentProps } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BOOKING_STEP = 3;
const BOOKING_TOTAL_STEPS = 4;

export default function BookVetSelectServiceScreen() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ vetId?: string; vetName?: string; petId?: string }>();
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const vetId = one(params.vetId) ?? "";
  const vetName = one(params.vetName) ?? "";
  const petId = one(params.petId) ?? "";

  const [selectedId, setSelectedId] = useState<VetBookingServiceId | null>(null);
  const [viewMode, setViewMode] = useState<BookingViewMode>("list");

  const cardBg = isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const selectedBorder = "#3BD0D2";

  const onContinue = useCallback(() => {
    if (!selectedId) return;
    router.push({
      pathname: "/book-vet-visit/pick-datetime",
      params: {
        vetId,
        vetName,
        petId,
        serviceId: selectedId,
      },
    });
  }, [selectedId, router, vetId, vetName, petId]);

  const listData = useMemo(() => VET_BOOKING_SERVICES_CATALOG, []);

  if (!vetId) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center mb-4" style={{ fontFamily: "Poppins_500Medium", color: theme.secondary }}>
            Pick a clinic first, then choose a service.
          </Text>
          <Pressable onPress={() => router.back()} className="py-3 px-6 rounded-full" style={{ backgroundColor: "#3BD0D2" }}>
            <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF" }}>Go back</Text>
          </Pressable>
        </View>
        <BottomNavBar activeTab="home" />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8 }}>
        <BookingFlowHeader
          onBack={() => router.back()}
          currentStep={BOOKING_STEP}
          totalSteps={BOOKING_TOTAL_STEPS}
          showViewModeToggle={false}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isDark={isDark}
          foreground={theme.foreground}
        />
        <Text
          className="text-xl font-bold mb-1"
          style={{ fontFamily: "Poppins_700Bold", color: theme.foreground }}
        >
          Select Service
        </Text>
        {vetName ? (
          <Text
            className="text-sm mb-4"
            style={{ fontFamily: "Poppins_400Regular", color: theme.secondary }}
            numberOfLines={2}
          >
            {vetName}
          </Text>
        ) : (
          <View className="mb-4" />
        )}
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 20, gap: 12, marginBottom: 12 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        renderItem={({ item }) => {
          const selected = selectedId === item.id;
          return (
            <Pressable
              onPress={() => setSelectedId(item.id)}
              className="flex-1 rounded-2xl p-4 items-center active:opacity-90"
              style={{
                backgroundColor: cardBg,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? selectedBorder : cardBorder,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.25 : 0.06,
                shadowRadius: 8,
                elevation: 2,
                flex: 1,
              }}
            >
              <View
                className="w-14 h-14 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: item.circleBg }}
              >
                <MaterialCommunityIcons
                  name={item.icon as ComponentProps<typeof MaterialCommunityIcons>["name"]}
                  size={28}
                  color="#0D0F0F"
                />
              </View>
              <Text
                className="text-center text-sm font-semibold"
                style={{ fontFamily: "Poppins_600SemiBold", color: theme.foreground }}
                numberOfLines={2}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />

      <View
        className="absolute left-0 right-0 px-5"
        style={{
          bottom: Math.max(insets.bottom, 12) + 56,
        }}
      >
        <Pressable
          onPress={onContinue}
          disabled={!selectedId}
          className="py-4 rounded-full items-center"
          style={{
            backgroundColor: selectedId ? "#3BD0D2" : isDark ? "rgba(255,255,255,0.12)" : "#E4E8EA",
          }}
        >
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 16,
              color: selectedId ? "#FFFFFF" : theme.secondary,
            }}
          >
            Continue
          </Text>
        </Pressable>
      </View>

      <BottomNavBar activeTab="home" />
    </View>
  );
}
