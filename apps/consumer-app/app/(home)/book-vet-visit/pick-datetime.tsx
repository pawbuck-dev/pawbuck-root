import { BookingFlowHeader, type BookingViewMode } from "@/components/booking/BookingFlowHeader";
import BottomNavBar from "@/components/home/BottomNavBar";
import { ALL_DEMO_VET_CLINICS } from "@/constants/mockVancouverVets";
import { VET_BOOKING_SERVICES_CATALOG } from "@/constants/vetBookingServices";
import { bookAppointment, fetchAvailability, type NormalizedSlotDto } from "@/services/bookingsApi";
import { insertVetBooking } from "@/services/vetBookings";
import { formatTimeLabelFromUtc, localDateKeyFromUtc } from "@/utils/bookingSlotFormat";
import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";
import { supabase } from "@/utils/supabase";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BOOKING_STEP = 4;
const BOOKING_TOTAL_STEPS = 4;

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function toIso(y: number, m0: number, day: number) {
  return `${y}-${pad(m0 + 1)}-${pad(day)}`;
}

function newIdempotencyKey(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `book-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

type ApiSlotPick = {
  startUtc: string;
  endUtc: string;
  selectionToken: string;
  label: string;
};

export default function BookVetPickDateTimeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    vetId?: string;
    vetName?: string;
    petId?: string;
    serviceId?: string;
  }>();

  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const vetId = one(params.vetId) ?? "";
  const vetName = one(params.vetName) ?? "";
  const petId = one(params.petId) ?? "";
  const serviceId = one(params.serviceId) ?? "";

  const vet = useMemo(() => ALL_DEMO_VET_CLINICS.find((v) => v.id === vetId), [vetId]);
  const schedulingClinicId = vet?.schedulingClinicId ?? "";
  const useApi = Boolean(getPawbuckApiBaseUrl() && schedulingClinicId);

  const serviceLabel = useMemo(
    () => VET_BOOKING_SERVICES_CATALOG.find((s) => s.id === serviceId)?.label ?? serviceId,
    [serviceId]
  );

  const today = useMemo(() => {
    const n = new Date();
    n.setHours(0, 0, 0, 0);
    return n;
  }, []);

  const [viewMode, setViewMode] = useState<BookingViewMode>("list");
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m0: n.getMonth() };
  });
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [selectedApiSlot, setSelectedApiSlot] = useState<ApiSlotPick | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Synchronous guard: multiple onPress can run before `submitting` re-renders. */
  const bookingSubmitLockRef = useRef(false);

  const { y, m0 } = cursor;

  useEffect(() => {
    if (!selectedIso) return;
    const parts = selectedIso.split("-").map(Number);
    if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return;
    const [ys, ms] = parts;
    if (ys !== y || (ms ?? 0) - 1 !== m0) {
      setSelectedIso(null);
      setSelectedApiSlot(null);
    }
  }, [y, m0, selectedIso]);

  const monthRangeIso = useMemo(() => {
    const rangeStart = new Date(y, m0, 1);
    const rangeEnd = new Date(y, m0 + 1, 0, 23, 59, 59, 999);
    return { rangeStartUtc: rangeStart.toISOString(), rangeEndUtc: rangeEnd.toISOString() };
  }, [y, m0]);

  const {
    data: availability,
    isLoading: availabilityLoading,
    isError: availabilityError,
    error: availabilityErr,
    refetch,
  } = useQuery({
    queryKey: ["booking-availability", schedulingClinicId, y, m0],
    queryFn: () =>
      fetchAvailability({
        clinicId: schedulingClinicId,
        rangeStartUtc: monthRangeIso.rangeStartUtc,
        rangeEndUtc: monthRangeIso.rangeEndUtc,
      }),
    enabled: useApi,
    staleTime: 60_000,
  });

  const apiSlots: NormalizedSlotDto[] = availability?.slots ?? [];

  const daysWithApiSlots = useMemo(() => {
    const set = new Set<string>();
    for (const s of apiSlots) {
      set.add(localDateKeyFromUtc(s.startUtc));
    }
    return set;
  }, [apiSlots]);

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedIso) return [] as NormalizedSlotDto[];
    return apiSlots
      .filter((s) => localDateKeyFromUtc(s.startUtc) === selectedIso)
      .sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime());
  }, [apiSlots, selectedIso]);

  const teal = "#3BD0D2";
  const trackBg = isDark ? "rgba(255,255,255,0.12)" : "#E4E8EA";
  const cellGap = 6;
  const gridPad = 20;
  const cellSize = Math.floor((width - gridPad * 2 - cellGap * 6) / 7);

  const firstWeekday = new Date(y, m0, 1).getDay();
  const daysInMonth = new Date(y, m0 + 1, 0).getDate();
  const monthLabel = new Date(y, m0, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  const calendarCells = useMemo(() => {
    const cells: { day: number | null; iso: string | null }[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, iso: null });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, iso: toIso(y, m0, d) });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, iso: null });
    return cells;
  }, [firstWeekday, daysInMonth, y, m0]);

  const onSelectDay = useCallback(
    (iso: string | null) => {
      if (!iso) return;
      const t = new Date(iso + "T12:00:00");
      if (t < today) return;
      setSelectedIso(iso);
      setSelectedApiSlot(null);
    },
    [today]
  );

  const goPrevMonth = useCallback(() => {
    setCursor((c) => {
      if (c.m0 === 0) return { y: c.y - 1, m0: 11 };
      return { y: c.y, m0: c.m0 - 1 };
    });
  }, []);

  const goNextMonth = useCallback(() => {
    setCursor((c) => {
      if (c.m0 === 11) return { y: c.y + 1, m0: 0 };
      return { y: c.y, m0: c.m0 + 1 };
    });
  }, []);

  const canContinue = Boolean(useApi && selectedIso && selectedApiSlot);

  const onContinue = useCallback(async () => {
    if (!canContinue || !selectedIso || !useApi) return;

    if (!selectedApiSlot || !schedulingClinicId) return;

    if (bookingSubmitLockRef.current) return;
    bookingSubmitLockRef.current = true;
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      const notes = JSON.stringify({ serviceId, serviceLabel });

      const booked = await bookAppointment({
        clinicId: schedulingClinicId,
        startUtc: selectedApiSlot.startUtc,
        endUtc: selectedApiSlot.endUtc,
        selectionToken: selectedApiSlot.selectionToken ?? "",
        userId: userId && isUuid(userId) ? userId : undefined,
        petId: petId && isUuid(petId) ? petId : undefined,
        notes,
        idempotencyKey: newIdempotencyKey(),
      });

      const inserted = await insertVetBooking({
        petId: petId && isUuid(petId) ? petId : null,
        clinicId: schedulingClinicId,
        clinicName: vet?.name ?? vetName,
        serviceId,
        serviceLabel,
        startUtc: booked.startUtc,
        endUtc: booked.endUtc,
        externalAppointmentId: booked.externalAppointmentId,
        pawbuckAppointmentId: booked.id ?? null,
        notes,
      });

      if (!inserted) {
        Alert.alert(
          "Saved with API",
          "Your appointment was booked, but it could not be saved to your PawBuck account. Check Supabase migration `vet_bookings` and sign-in."
        );
      }

      router.push({
        pathname: "/book-vet-visit/booking-confirmed",
        params: {
          vetId,
          vetName,
          petId,
          serviceId,
          date: selectedIso,
          time: selectedApiSlot.label,
          source: "api",
          bookingRef: booked.externalAppointmentId,
          externalAppointmentId: booked.externalAppointmentId,
          bookingRowId: inserted?.id ?? "",
          pawbuckAppointmentId: booked.id ?? "",
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Booking failed";
      Alert.alert("Could not book", msg);
    } finally {
      bookingSubmitLockRef.current = false;
      setSubmitting(false);
    }
  }, [
    canContinue,
    selectedIso,
    selectedApiSlot,
    useApi,
    router,
    vetId,
    vetName,
    petId,
    serviceId,
    serviceLabel,
    schedulingClinicId,
    vet,
  ]);

  if (!vetId || !serviceId) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center mb-4" style={{ fontFamily: "Poppins_500Medium", color: theme.secondary }}>
            Missing booking details. Go back and pick a clinic and service.
          </Text>
          <Pressable onPress={() => router.back()} className="py-3 px-6 rounded-full" style={{ backgroundColor: teal }}>
            <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF" }}>Go back</Text>
          </Pressable>
        </View>
        <BottomNavBar activeTab="home" />
      </View>
    );
  }

  const errMessage = availabilityErr instanceof Error ? availabilityErr.message : "Failed to load slots";

  /** No PawBuck.API base URL = no fake slots; honest empty state. */
  if (!useApi) {
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
            className="text-xl font-bold mb-2"
            style={{ fontFamily: "Poppins_700Bold", color: theme.foreground }}
          >
            Pick Date & Time
          </Text>
          <Text
            className="text-sm leading-5 mb-4"
            style={{ fontFamily: "Poppins_400Regular", color: theme.secondary }}
          >
            Online scheduling isn’t connected yet. You’ll choose a date and time here once your clinic’s calendar is
            linked to PawBuck.
          </Text>
        </View>
        <View className="flex-1 px-8 justify-center items-center">
          <Ionicons name="calendar-outline" size={56} color={theme.secondary} style={{ marginBottom: 16 }} />
          <Text
            className="text-center text-base mb-2"
            style={{ fontFamily: "Poppins_600SemiBold", color: theme.foreground }}
          >
            No times available
          </Text>
          <Text
            className="text-center text-sm leading-5"
            style={{ fontFamily: "Poppins_400Regular", color: theme.secondary }}
          >
            There’s nothing to pick until online scheduling is turned on for this clinic.
          </Text>
          {__DEV__ ? (
            <Text
              className="text-center text-xs mt-4 leading-4 px-2"
              style={{ fontFamily: "Poppins_400Regular", color: theme.secondary, opacity: 0.9 }}
            >
              Dev: run PawBuck.API (<Text style={{ fontFamily: "Poppins_600SemiBold" }}>backend/PawBuck.API</Text>
              ,{" "}
              <Text style={{ fontFamily: "Poppins_600SemiBold" }}>dotnet run</Text>), set{" "}
              <Text style={{ fontFamily: "Poppins_600SemiBold" }}>EXPO_PUBLIC_PAWBUCK_API_URL</Text> in .env.local, then
              restart Metro.
            </Text>
          ) : null}
          <Pressable
            onPress={() => router.back()}
            className="mt-10 py-3 px-8 rounded-full"
            style={{ backgroundColor: teal }}
          >
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
          Pick Date & Time
        </Text>
      </View>

      {availabilityLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={teal} />
          <Text className="mt-3" style={{ fontFamily: "Poppins_500Medium", color: theme.secondary }}>
            Loading availability…
          </Text>
        </View>
      ) : availabilityError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center mb-4" style={{ fontFamily: "Poppins_500Medium", color: theme.secondary }}>
            {errMessage}
          </Text>
          <Pressable onPress={() => void refetch()} className="py-3 px-6 rounded-full" style={{ backgroundColor: teal }}>
            <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF" }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: gridPad, paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            className="flex-row items-center justify-between rounded-2xl px-3 py-3 mb-4"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : trackBg }}
          >
            <Pressable onPress={goPrevMonth} hitSlop={12} className="p-2">
              <Ionicons name="chevron-back" size={22} color={theme.foreground} />
            </Pressable>
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: theme.foreground }}>{monthLabel}</Text>
            <Pressable onPress={goNextMonth} hitSlop={12} className="p-2">
              <Ionicons name="chevron-forward" size={22} color={theme.foreground} />
            </Pressable>
          </View>

          <View className="flex-row mb-2" style={{ gap: cellGap }}>
            {WEEKDAYS.map((w) => (
              <View key={w} style={{ width: cellSize, alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: "Poppins_500Medium",
                    fontSize: 11,
                    color: theme.secondary,
                  }}
                >
                  {w}
                </Text>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap mb-6 self-stretch" style={{ gap: cellGap }}>
            {calendarCells.map((cell, idx) => {
              if (cell.day === null || !cell.iso) {
                return <View key={`e-${idx}`} style={{ width: cellSize, height: cellSize + 8 }} />;
              }
              const t = new Date(cell.iso + "T12:00:00");
              const past = t < today;
              const selected = selectedIso === cell.iso;
              const dot = daysWithApiSlots.has(cell.iso);
              return (
                <Pressable
                  key={cell.iso}
                  disabled={past}
                  onPress={() => onSelectDay(cell.iso)}
                  style={{
                    width: cellSize,
                    height: cellSize + 8,
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingTop: 4,
                    borderRadius: 10,
                    backgroundColor: selected ? teal : isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
                    opacity: past ? 0.35 : 1,
                    borderWidth: !selected && !past ? 1 : 0,
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 15,
                      color: selected ? "#FFFFFF" : theme.foreground,
                    }}
                  >
                    {cell.day}
                  </Text>
                  <View style={{ height: 6, marginTop: 2, justifyContent: "center" }}>
                    {dot ? (
                      <View
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 3,
                          backgroundColor: selected ? "#FFFFFF" : teal,
                        }}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text
            className="text-base font-bold mb-3"
            style={{ fontFamily: "Poppins_700Bold", color: theme.foreground }}
          >
            Available Times
          </Text>

          {!selectedIso ? (
            <Text style={{ fontFamily: "Poppins_400Regular", color: theme.secondary }}>Select a date to see time slots.</Text>
          ) : slotsForSelectedDay.length === 0 ? (
            <Text style={{ fontFamily: "Poppins_400Regular", color: theme.secondary }}>
              No open times this day. Try another date.
            </Text>
          ) : (
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              {slotsForSelectedDay.map((slot) => {
                const label = formatTimeLabelFromUtc(slot.startUtc);
                const active = selectedApiSlot?.startUtc === slot.startUtc;
                return (
                  <Pressable
                    key={slot.startUtc}
                    onPress={() =>
                      setSelectedApiSlot({
                        startUtc: slot.startUtc,
                        endUtc: slot.endUtc,
                        selectionToken: slot.selectionToken ?? "",
                        label,
                      })
                    }
                    className="rounded-full px-4 py-3"
                    style={{
                      width: (width - gridPad * 2 - 20) / 3,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: active ? teal : isDark ? "rgba(255,255,255,0.12)" : "#D0D5D8",
                      backgroundColor: active ? "rgba(59, 208, 210, 0.15)" : isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: "Poppins_500Medium",
                        fontSize: 13,
                        color: theme.foreground,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <View
        className="absolute left-0 right-0 px-5"
        style={{
          bottom: Math.max(insets.bottom, 12) + 56,
        }}
      >
        <Pressable
          onPress={() => void onContinue()}
          disabled={!canContinue || submitting}
          className="py-4 rounded-full items-center flex-row justify-center"
          style={{
            backgroundColor: canContinue && !submitting ? teal : isDark ? "rgba(255,255,255,0.12)" : "#E4E8EA",
          }}
        >
          {submitting ? <ActivityIndicator color="#FFFFFF" style={{ marginRight: 8 }} /> : null}
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 16,
              color: canContinue && !submitting ? "#FFFFFF" : theme.secondary,
            }}
          >
            {submitting ? "Booking…" : "Continue"}
          </Text>
        </Pressable>
      </View>

      <BottomNavBar activeTab="home" />
    </View>
  );
}
