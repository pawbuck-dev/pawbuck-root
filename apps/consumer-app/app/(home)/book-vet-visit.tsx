import { BookingFlowHeader, type BookingViewMode } from "@/components/booking/BookingFlowHeader";
import { VetClinicMap } from "@/components/booking/VetClinicMap";
import { openGoogleMapsDrivingDirections } from "@/utils/openGoogleMapsDirections";
import BottomNavBar from "@/components/home/BottomNavBar";
import { MOCK_VANCOUVER_VETS, SPOOFED_LOCATION, type MockNearbyVet } from "@/constants/mockVancouverVets";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Match Figma booking flow progress (adjust when earlier steps exist). */
const BOOKING_STEP = 2;
const BOOKING_TOTAL_STEPS = 4;

function VetRow({
  vet,
  isDark,
  cardBg,
  borderColor,
  onPress,
  onDirections,
}: {
  vet: MockNearbyVet;
  isDark: boolean;
  cardBg: string;
  borderColor: string;
  onPress: () => void;
  onDirections: () => void;
}) {
  return (
    <View
      className="mb-3 flex-row items-stretch overflow-hidden"
      style={{
        backgroundColor: cardBg,
        borderRadius: 16,
        borderWidth: Platform.OS === "android" ? 0 : 1,
        borderColor,
      }}
    >
      <Pressable onPress={onPress} className="flex-1 p-4 active:opacity-90">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-3">
            <Text
              className="text-base font-semibold mb-1"
              style={{ fontFamily: "Poppins_600SemiBold", color: isDark ? "#FFFFFF" : "#0D0F0F" }}
            >
              {vet.name}
            </Text>
            <Text
              className="text-sm mb-2"
              style={{ fontFamily: "Poppins_400Regular", color: isDark ? "rgba(255,255,255,0.65)" : "#5A5F6A" }}
            >
              {vet.address}, {vet.city}
            </Text>
            <View className="flex-row items-center gap-3 flex-wrap">
              <View className="flex-row items-center gap-1">
                <Ionicons name="star" size={14} color="#F5A623" />
                <Text
                  className="text-xs"
                  style={{ fontFamily: "Poppins_500Medium", color: isDark ? "#FFFFFF" : "#1D2433" }}
                >
                  {vet.rating} ({vet.reviewCount})
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Ionicons name="navigate-outline" size={14} color="#3BD0D2" />
                <Text
                  className="text-xs"
                  style={{ fontFamily: "Poppins_500Medium", color: "#3BD0D2" }}
                >
                  {vet.distanceKm.toFixed(1)} km away
                </Text>
              </View>
            </View>
          </View>
          <View
            className="rounded-full px-3 py-2 self-start"
            style={{ backgroundColor: "rgba(59, 208, 210, 0.15)" }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ fontFamily: "Poppins_600SemiBold", color: "#3BD0D2" }}
            >
              Book
            </Text>
          </View>
        </View>
      </Pressable>
      <Pressable
        onPress={onDirections}
        accessibilityLabel={`Driving directions to ${vet.name}`}
        className="justify-center px-3 border-l active:opacity-80"
        style={{
          borderLeftColor: borderColor,
          backgroundColor: isDark ? "rgba(59, 208, 210, 0.08)" : "rgba(59, 208, 210, 0.06)",
        }}
      >
        <Ionicons name="car-outline" size={22} color="#3BD0D2" />
      </Pressable>
    </View>
  );
}

export default function BookVetVisitScreen() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const insets = useSafeAreaInsets();
  const { pets, loadingPets } = usePets();
  const { selectedPetId, setSelectedPetId } = useSelectedPet();
  const [bookingPetId, setBookingPetId] = useState<string | null>(selectedPetId ?? null);
  const [viewMode, setViewMode] = useState<BookingViewMode>("list");
  const [mapSelectedVetId, setMapSelectedVetId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPetId && !bookingPetId) setBookingPetId(selectedPetId);
  }, [selectedPetId, bookingPetId]);

  const sortedVets = useMemo(
    () => [...MOCK_VANCOUVER_VETS].sort((a, b) => a.distanceKm - b.distanceKm),
    []
  );

  useEffect(() => {
    if (viewMode !== "map" || sortedVets.length === 0) return;
    setMapSelectedVetId((prev) => prev ?? sortedVets[0]!.id);
  }, [viewMode, sortedVets]);

  const bookingPet = useMemo(
    () => pets.find((p) => p.id === bookingPetId) ?? pets[0],
    [pets, bookingPetId]
  );

  const onSelectVet = useCallback(
    (vet: MockNearbyVet) => {
      if (!bookingPet) {
        Alert.alert("Select a pet", "Choose which pet this visit is for.");
        return;
      }
      Alert.alert(
        "Coming soon",
        `${vet.name} — scheduling will open here once your clinic is connected in PawBuck.\n\nPet: ${bookingPet.name}\nLocation: ${SPOOFED_LOCATION.label} (demo)`
      );
    },
    [bookingPet]
  );

  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";

  const petPicker = (
    <>
      <Text
        className="text-sm font-semibold mb-2 px-5"
        style={{ fontFamily: "Poppins_600SemiBold", color: theme.foreground }}
      >
        Which pet is this visit for?
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 pl-5 pr-5">
        <View className="flex-row gap-2 pb-2">
          {pets.map((pet) => {
            const selected = (bookingPetId ?? selectedPetId) === pet.id;
            return (
              <Pressable
                key={pet.id}
                onPress={() => {
                  setBookingPetId(pet.id);
                  setSelectedPetId(pet.id);
                }}
                className="flex-row items-center px-3 py-2 rounded-full border"
                style={{
                  backgroundColor: selected ? "rgba(59, 208, 210, 0.15)" : cardBg,
                  borderColor: selected ? "#3BD0D2" : cardBorder,
                }}
              >
                {pet.photo_url ? (
                  <Image
                    source={{ uri: pet.photo_url }}
                    style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8 }}
                  />
                ) : (
                  <View
                    className="w-7 h-7 rounded-full items-center justify-center mr-2"
                    style={{ backgroundColor: theme.border }}
                  >
                    <Ionicons name="paw" size={14} color={theme.secondary} />
                  </View>
                )}
                <Text
                  className="text-sm font-medium"
                  style={{
                    fontFamily: "Poppins_500Medium",
                    color: selected ? "#3BD0D2" : theme.foreground,
                  }}
                >
                  {pet.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </>
  );

  const listHeader = (
    <>
      <View className="rounded-2xl overflow-hidden mb-5" style={{ height: 140 }}>
        <LinearGradient
          colors={isDark ? ["#1a3d3e", "#0d2526"] : ["#B2EBF2", "#E8F8F8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <View
            className="absolute"
            style={{
              top: 16,
              right: 24,
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(59, 208, 210, 0.25)",
            }}
          />
          <Ionicons name="map-outline" size={48} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(45,168,158,0.4)"} />
        </LinearGradient>
        <View
          className="absolute bottom-3 left-3 right-3 flex-row items-center px-3 py-2 rounded-xl"
          style={{
            backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.92)",
          }}
        >
          <View
            className="w-9 h-9 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: "rgba(59, 208, 210, 0.2)" }}
          >
            <Ionicons name="location" size={20} color="#3BD0D2" />
          </View>
          <View className="flex-1">
            <Text
              className="text-sm font-semibold"
              style={{ fontFamily: "Poppins_600SemiBold", color: isDark ? "#FFFFFF" : "#0D0F0F" }}
            >
              {SPOOFED_LOCATION.label}
            </Text>
            <Text
              className="text-xs"
              style={{ fontFamily: "Poppins_400Regular", color: isDark ? "rgba(255,255,255,0.6)" : "#5A5F6A" }}
            >
              Demo location · {sortedVets.length} clinics nearby
            </Text>
          </View>
          <View className="px-2 py-1 rounded-md" style={{ backgroundColor: "rgba(59, 208, 210, 0.2)" }}>
            <Text className="text-[10px] font-semibold" style={{ fontFamily: "Poppins_600SemiBold", color: "#3BD0D2" }}>
              DEMO
            </Text>
          </View>
        </View>
      </View>
      <Text
        className="text-sm font-semibold mb-3 mt-1"
        style={{ fontFamily: "Poppins_600SemiBold", color: theme.foreground }}
      >
        Nearby veterinary clinics
      </Text>
    </>
  );

  if (loadingPets) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Text style={{ color: theme.secondary, fontFamily: "Poppins_500Medium" }}>Loading…</Text>
      </View>
    );
  }

  if (pets.length === 0) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
          <Pressable onPress={() => router.back()} hitSlop={12} className="mb-6 self-start">
            <Ionicons name="chevron-back" size={28} color={theme.foreground} />
          </Pressable>
          <Text className="text-xl font-bold" style={{ fontFamily: "Poppins_700Bold", color: theme.foreground }}>
            Book a visit
          </Text>
          <Text className="mt-2" style={{ fontFamily: "Poppins_400Regular", color: theme.secondary }}>
            Add a pet to your profile first, then you can book a vet visit.
          </Text>
          <Pressable
            onPress={() => router.push("/onboarding/step1")}
            className="mt-6 py-3 px-6 rounded-full self-start"
            style={{ backgroundColor: "#3BD0D2" }}
          >
            <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF" }}>Add a pet</Text>
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
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isDark={isDark}
          foreground={theme.foreground}
        />
        {petPicker}
      </View>

      {viewMode === "list" ? (
        <FlatList
          data={sortedVets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <VetRow
              vet={item}
              isDark={isDark}
              cardBg={cardBg}
              borderColor={cardBorder}
              onPress={() => onSelectVet(item)}
              onDirections={() => {
                void openGoogleMapsDrivingDirections(item.latitude, item.longitude, item.name).catch(() =>
                  Alert.alert("Could not open Maps", "Try again or open Google Maps manually.")
                );
              }}
            />
          )}
        />
      ) : (
        <View className="flex-1 pb-24">
          <VetClinicMap
            vets={sortedVets}
            selectedVetId={mapSelectedVetId}
            onHighlightVet={(v) => setMapSelectedVetId(v.id)}
          />
          <Text
            className="text-sm font-semibold mb-2 px-5"
            style={{ fontFamily: "Poppins_600SemiBold", color: theme.foreground }}
          >
            Clinics — tap a pin or card, then use directions or book
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row" }}
          >
            {sortedVets.map((vet) => {
              const selected = mapSelectedVetId === vet.id;
              return (
                <View
                  key={vet.id}
                  className="mr-2 rounded-2xl border overflow-hidden max-w-[210px]"
                  style={{
                    backgroundColor: cardBg,
                    borderColor: selected ? "#3BD0D2" : cardBorder,
                    borderWidth: Platform.OS === "android" ? 0 : 1,
                  }}
                >
                  <Pressable onPress={() => setMapSelectedVetId(vet.id)} className="px-4 pt-3 pb-2 active:opacity-90">
                    <Text
                      className="text-sm font-semibold mb-1"
                      numberOfLines={2}
                      style={{ fontFamily: "Poppins_600SemiBold", color: theme.foreground }}
                    >
                      {vet.name}
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ fontFamily: "Poppins_400Regular", color: "#3BD0D2" }}
                    >
                      {vet.distanceKm.toFixed(1)} km
                    </Text>
                  </Pressable>
                  <View className="flex-row border-t" style={{ borderTopColor: cardBorder }}>
                    <Pressable
                      onPress={() => {
                        void openGoogleMapsDrivingDirections(vet.latitude, vet.longitude, vet.name).catch(() =>
                          Alert.alert("Could not open Maps", "Try again or open Google Maps manually.")
                        );
                      }}
                      className="flex-1 py-2.5 items-center active:opacity-80"
                      style={{ backgroundColor: "rgba(59, 208, 210, 0.1)" }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ fontFamily: "Poppins_600SemiBold", color: "#3BD0D2" }}
                      >
                        Drive
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onSelectVet(vet)}
                      className="flex-1 py-2.5 items-center active:opacity-80"
                      style={{ backgroundColor: "rgba(59, 208, 210, 0.22)" }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ fontFamily: "Poppins_600SemiBold", color: isDark ? "#FFFFFF" : "#0D4A4B" }}
                      >
                        Book
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      <BottomNavBar activeTab="home" />
    </View>
  );
}
