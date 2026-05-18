import PetCalendarMonthGrid, { CATEGORY_DOT_COLORS } from "@/components/calendar/PetCalendarMonthGrid";
import BottomNavBar from "@/components/home/BottomNavBar";
import { SHOW_VET_BOOKING_UI } from "@/constants/vetBooking";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import {
  categoryDisplayLabel,
  fetchCalendarEvents,
  isVetBookingEvent,
} from "@/services/calendarEvents";
import { addEventToDeviceCalendar } from "@/services/deviceCalendar";
import {
  confirmVetBookingImport,
  dismissVetBookingImport,
} from "@/services/vetBookings";
import type { CalendarEvent } from "@/types/calendarEvent";
import { eventsOnDate } from "@/utils/petCalendarGrid";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import moment from "moment";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { pets } = usePets();
  const { selectedPetId } = useSelectedPet();
  const queryClient = useQueryClient();
  const [filterThisPetOnly, setFilterThisPetOnly] = useState(false);

  const [visibleMonth, setVisibleMonth] = useState(() => moment());
  const [selectedDay, setSelectedDay] = useState(() => moment().format("YYYY-MM-DD"));

  const petIdFilter = filterThisPetOnly && selectedPetId ? selectedPetId : undefined;
  const startAfterIso = useMemo(
    () => moment().subtract(14, "days").startOf("day").toISOString(),
    []
  );

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendarEvents", petIdFilter ?? "all", startAfterIso],
    queryFn: () =>
      fetchCalendarEvents({
        petId: petIdFilter,
        startAfterIso,
      }),
  });

  const petNameById = useMemo(() => {
    const m = new Map<string, string>();
    pets.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [pets]);

  const pending = useMemo(
    () =>
      events.filter(
        (e) => isVetBookingEvent(e) && e.status === "pending_confirmation"
      ),
    [events]
  );

  const scheduleDayEvents = useMemo(
    () =>
      eventsOnDate(
        events.filter((e) => e.status !== "pending_confirmation"),
        selectedDay
      ),
    [events, selectedDay]
  );

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmVetBookingImport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      queryClient.invalidateQueries({ queryKey: ["vetBookings"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => dismissVetBookingImport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      queryClient.invalidateQueries({ queryKey: ["vetBookings"] });
    },
  });

  const onAddToDevice = async (event: CalendarEvent) => {
    if (!isVetBookingEvent(event)) return;
    const b = event.raw;
    const start = new Date(b.start_utc);
    const end = new Date(b.end_utc);
    const ok = await addEventToDeviceCalendar({
      title: b.service_label ?? event.title,
      startDate: start,
      endDate: end,
      location: b.clinic_name,
      notes: b.notes,
    });
    if (ok) {
      Alert.alert("Calendar", "Event added to your calendar.");
    }
  };

  const renderEventRow = (event: CalendarEvent, showPet: boolean) => {
    const petLabel = event.petId ? petNameById.get(event.petId) : null;
    const timeRange = `${moment(event.startUtc).format("h:mm A")} – ${moment(event.endUtc).format("h:mm A")}`;
    const isEmailImport =
      isVetBookingEvent(event) &&
      (event.raw.booking_source === "email_ics" || event.raw.booking_source === "email_nlp");
    const dotColor = CATEGORY_DOT_COLORS[event.category];

    return (
      <View
        key={event.id}
        style={{
          marginBottom: 12,
          padding: 14,
          borderRadius: 14,
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              backgroundColor: `${dotColor}22`,
            }}
          >
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 11, color: dotColor }}>
              {categoryDisplayLabel(event.category)}
            </Text>
          </View>
        </View>
        <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: theme.foreground }}>
          {event.title}
        </Text>
        <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 13, color: theme.secondary, marginTop: 4 }}>
          {timeRange}
          {event.subtitle ? ` · ${event.subtitle}` : ""}
        </Text>
        {showPet && petLabel ? (
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: theme.secondary, marginTop: 4 }}>
            {petLabel}
          </Text>
        ) : null}
        {isEmailImport && event.status === "pending_confirmation" ? (
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: "#B45309", marginTop: 6 }}>
            From email — confirm this time is correct
          </Text>
        ) : null}
        {isVetBookingEvent(event) && event.status === "pending_confirmation" ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Pressable
              onPress={() => confirmMutation.mutate(event.raw.id)}
              disabled={confirmMutation.isPending}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: "#3BD0D2",
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: "#FFFFFF" }}>Confirm</Text>
            </Pressable>
            <Pressable
              onPress={() => dismissMutation.mutate(event.raw.id)}
              disabled={dismissMutation.isPending}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: theme.foreground }}>Dismiss</Text>
            </Pressable>
          </View>
        ) : isVetBookingEvent(event) ? (
          <Pressable
            onPress={() => onAddToDevice(event)}
            style={{
              marginTop: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              alignSelf: "flex-start",
            }}
          >
            <Ionicons name="calendar-outline" size={18} color={theme.primary} />
            <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 14, color: theme.primary }}>
              Add to phone calendar
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const emptyRangeHelper = SHOW_VET_BOOKING_UI
    ? "Vet visits, grooming, and walks appear here when you book in PawBuck or confirm calendar invites from your pet’s inbox."
    : "Pet events from email calendar invites (vet, grooming, walks) appear here after you confirm them.";

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        className="flex-row items-center justify-between px-4 pb-2 border-b"
        style={{
          paddingTop: insets.top + 8,
          borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} className="flex-row items-center gap-1">
          <Ionicons name="chevron-back" size={24} color={theme.foreground} />
          <Text style={{ fontFamily: "Poppins_500Medium", color: theme.foreground }}>Back</Text>
        </Pressable>
        <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 18, color: theme.foreground }}>Calendar</Text>
        <View style={{ width: 72 }} />
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {selectedPetId ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontFamily: "Poppins_500Medium", color: theme.foreground }}>
              Selected pet only
            </Text>
            <Switch value={filterThisPetOnly} onValueChange={setFilterThisPetOnly} />
          </View>
        ) : null}

        {SHOW_VET_BOOKING_UI ? (
          <Pressable
            onPress={() => router.push("/(home)/book-vet-visit" as any)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 14,
              borderRadius: 14,
              backgroundColor: isDark ? "rgba(59,208,210,0.12)" : "rgba(59,208,210,0.15)",
              marginBottom: 16,
            }}
          >
            <Ionicons name="add-circle-outline" size={22} color="#3BD0D2" />
            <Text style={{ fontFamily: "Poppins_600SemiBold", color: theme.foreground, flex: 1 }}>
              Book a vet visit
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </Pressable>
        ) : null}

        <PetCalendarMonthGrid
          year={visibleMonth.year()}
          month={visibleMonth.month()}
          selectedDay={selectedDay}
          events={events}
          onSelectDay={setSelectedDay}
          onPrevMonth={() =>
            setVisibleMonth((m) => {
              const next = m.clone().subtract(1, "month");
              return next;
            })
          }
          onNextMonth={() =>
            setVisibleMonth((m) => {
              const next = m.clone().add(1, "month");
              return next;
            })
          }
        />

        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginBottom: 16 }} />
        ) : null}

        {!isLoading && events.length === 0 ? (
          <Text
            style={{
              fontFamily: "Poppins_400Regular",
              fontSize: 13,
              color: theme.secondary,
              textAlign: "center",
              marginBottom: 20,
              paddingHorizontal: 8,
              lineHeight: 20,
            }}
          >
            {emptyRangeHelper}
          </Text>
        ) : null}

        {pending.length > 0 ? (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: theme.foreground, marginBottom: 10 }}>
              Needs confirmation
            </Text>
            {pending.map((e) => renderEventRow(e, true))}
          </View>
        ) : null}

        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: theme.foreground, marginBottom: 4 }}>
            {moment(selectedDay, "YYYY-MM-DD").format("dddd, MMM D")}
          </Text>
          {!isLoading && scheduleDayEvents.length === 0 ? (
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                fontSize: 13,
                color: theme.secondary,
                marginBottom: 10,
                marginTop: 4,
              }}
            >
              No events on this day.
            </Text>
          ) : null}
          {scheduleDayEvents.map((e) => renderEventRow(e, !petIdFilter))}
        </View>
      </ScrollView>

      <BottomNavBar activeTab="home" selectedPetId={selectedPetId ?? undefined} />
    </View>
  );
}
