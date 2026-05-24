import { BookingFlowHeader, type BookingViewMode } from "@/components/booking/BookingFlowHeader";
import { VetClinicBookCard } from "@/components/booking/VetClinicBookCard";
import { VetClinicMap } from "@/components/booking/VetClinicMap";
import { openGoogleMapsDrivingDirections } from "@/utils/openGoogleMapsDirections";
import BottomNavBar from "@/components/home/BottomNavBar";
import {
  ALL_DEMO_VET_CLINICS,
  DEFAULT_NEARBY_VET_RADIUS_KM,
  NEARBY_VET_RADIUS_OPTIONS_KM,
  SPOOFED_LOCATION,
  filterVetsBySearchRadius,
  type MockNearbyVet,
  type NearbyVetRadiusKm,
} from "@/constants/mockVancouverVets";
import { useOnboarding } from "@/context/onboardingContext";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { navigateToAddPetFlow } from "@/utils/navigateToAddPetFlow";
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

export default function BookVetVisitScreen() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const insets = useSafeAreaInsets();
  const { pets, loadingPets } = usePets();
  const { resetOnboarding } = useOnboarding();
  const { selectedPetId, setSelectedPetId } = useSelectedPet();
  const [bookingPetId, setBookingPetId] = useState<string | null>(selectedPetId ?? null);
  const [viewMode, setViewMode] = useState<BookingViewMode>("list");
  const [mapSelectedVetId, setMapSelectedVetId] = useState<string | null>(null);
  const [searchRadiusKm, setSearchRadiusKm] = useState<NearbyVetRadiusKm>(DEFAULT_NEARBY_VET_RADIUS_KM);

  useEffect(() => {
    if (selectedPetId && !bookingPetId) setBookingPetId(selectedPetId);
  }, [selectedPetId, bookingPetId]);

  const sortedVets = useMemo(
    () => filterVetsBySearchRadius(ALL_DEMO_VET_CLINICS, searchRadiusKm),
    [searchRadiusKm]
  );

  useEffect(() => {
    if (viewMode !== "map" || sortedVets.length === 0) return;
    setMapSelectedVetId((prev) => prev ?? sortedVets[0]!.id);
  }, [viewMode, sortedVets]);

  useEffect(() => {
    if (sortedVets.length === 0) return;
    if (mapSelectedVetId && !sortedVets.some((v) => v.id === mapSelectedVetId)) {
      setMapSelectedVetId(sortedVets[0]!.id);
    }
  }, [sortedVets, mapSelectedVetId]);

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
      router.push({
        pathname: "/book-vet-visit/select-service",
        params: {
          vetId: vet.id,
          vetName: vet.name,
          petId: bookingPet.id,
        },
      });
    },
    [bookingPet, router]
  );

  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";

  const mapSelectedVet = useMemo(
    () => (mapSelectedVetId ? sortedVets.find((v) => v.id === mapSelectedVetId) ?? null : null),
    [sortedVets, mapSelectedVetId]
  );

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

  const listHeader = useMemo(
    () => (
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
              Demo location · {sortedVets.length} within {searchRadiusKm} km
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
    ),
    [sortedVets.length, searchRadiusKm, isDark, theme.foreground]
  );

  const radiusPicker = (
    <View className="flex-row flex-wrap items-center gap-2 mb-2 px-5">
      <Text className="text-xs mr-1" style={{ fontFamily: "Poppins_500Medium", color: theme.secondary }}>
        Search radius
      </Text>
      {NEARBY_VET_RADIUS_OPTIONS_KM.map((r) => {
        const selected = searchRadiusKm === r;
        return (
          <Pressable
            key={r}
            onPress={() => setSearchRadiusKm(r)}
            className="px-3 py-1.5 rounded-full border"
            style={{
              backgroundColor: selected ? "rgba(59, 208, 210, 0.2)" : cardBg,
              borderColor: selected ? "#3BD0D2" : cardBorder,
              borderWidth: Platform.OS === "android" ? 0 : 1,
            }}
          >
            <Text
              className="text-xs font-semibold"
              style={{
                fontFamily: "Poppins_600SemiBold",
                color: selected ? "#3BD0D2" : theme.foreground,
              }}
            >
              {r} km
            </Text>
          </Pressable>
        );
      })}
    </View>
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
            onPress={() => {
              navigateToAddPetFlow({
                router,
                hasExistingPets: false,
                resetOnboarding,
              });
            }}
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
        {radiusPicker}
      </View>

      {viewMode === "list" ? (
        <FlatList
          data={sortedVets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <View className="mb-4">
              <VetClinicBookCard
                vet={item}
                isDark={isDark}
                onBookNow={() => onSelectVet(item)}
                onDirections={() => {
                  void openGoogleMapsDrivingDirections(item.latitude, item.longitude, item.name).catch(() =>
                    Alert.alert("Could not open Maps", "Try again or open Google Maps manually.")
                  );
                }}
              />
              <Text
                className="text-center mt-1 text-xs"
                style={{ fontFamily: "Poppins_400Regular", color: theme.secondary }}
              >
                {item.distanceKm.toFixed(1)} km away
              </Text>
            </View>
          )}
        />
      ) : (
        <View className="flex-1">
          {/* Fixed-height map — detail card scrolls below so nothing overlaps the clinic strip. */}
          <View className="mx-5 mb-2" style={{ height: 272 }}>
            <VetClinicMap
              embedded
              vets={sortedVets}
              selectedVetId={mapSelectedVetId}
              onHighlightVet={(v) => setMapSelectedVetId(v.id)}
              hideBottomDirectionsBar
              searchRadiusMeters={searchRadiusKm * 1000}
            />
          </View>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text
              className="text-sm font-semibold mb-1 px-5"
              style={{ fontFamily: "Poppins_600SemiBold", color: theme.foreground }}
            >
              Clinics in this area
            </Text>
            <Text
              className="text-xs mb-3 px-5"
              style={{ fontFamily: "Poppins_400Regular", color: theme.secondary }}
            >
              Tap a map pin or a clinic below, then use Book Now.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4, flexDirection: "row" }}
            >
              {sortedVets.map((vet, index) => {
                const selected = mapSelectedVetId === vet.id;
                return (
                  <Pressable
                    key={vet.id}
                    onPress={() => setMapSelectedVetId(vet.id)}
                    className="rounded-2xl border active:opacity-90"
                    style={{
                      minWidth: 156,
                      maxWidth: 220,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      marginRight: index < sortedVets.length - 1 ? 10 : 0,
                      backgroundColor: selected ? "rgba(59, 208, 210, 0.18)" : cardBg,
                      borderColor: selected ? "#3BD0D2" : cardBorder,
                      borderWidth: Platform.OS === "android" ? 0 : 1,
                    }}
                  >
                    <Text
                      className="text-sm leading-5"
                      numberOfLines={2}
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        color: selected ? "#3BD0D2" : theme.foreground,
                      }}
                    >
                      {vet.name}
                    </Text>
                    <Text
                      className="text-xs mt-1.5"
                      style={{ fontFamily: "Poppins_500Medium", color: theme.secondary }}
                    >
                      {vet.distanceKm.toFixed(1)} km away
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {mapSelectedVet ? (
              <View className="mt-5 px-5">
                <VetClinicBookCard
                  vet={mapSelectedVet}
                  isDark={isDark}
                  onBookNow={() => onSelectVet(mapSelectedVet)}
                  onDirections={() => {
                    void openGoogleMapsDrivingDirections(
                      mapSelectedVet.latitude,
                      mapSelectedVet.longitude,
                      mapSelectedVet.name
                    ).catch(() =>
                      Alert.alert("Could not open Maps", "Try again or open Google Maps manually.")
                    );
                  }}
                />
              </View>
            ) : (
              <View className="mt-6 mx-5 py-5 px-4 rounded-2xl" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}>
                <Text className="text-center text-sm leading-5" style={{ fontFamily: "Poppins_500Medium", color: theme.secondary }}>
                  Select a clinic from the list above or tap its pin on the map to see details and book.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <BottomNavBar activeTab="home" />
    </View>
  );
}
