import BottomNavBar from "@/components/home/BottomNavBar";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { addEventToDeviceCalendar } from "@/services/deviceCalendar";
import type { VetBookingRow } from "@/services/vetBookings";
import {
  confirmVetBookingImport,
  dismissVetBookingImport,
  fetchVetBookings,
} from "@/services/vetBookings";
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

function groupByDay(rows: VetBookingRow[]) {
  const map = new Map<string, VetBookingRow[]>();
  for (const r of rows) {
    const key = moment(r.start_utc).format("YYYY-MM-DD");
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { pets } = usePets();
  const { selectedPetId } = useSelectedPet();
  const queryClient = useQueryClient();
  const [filterThisPetOnly, setFilterThisPetOnly] = useState(false);

  const petIdFilter = filterThisPetOnly && selectedPetId ? selectedPetId : undefined;
  const startAfterIso = useMemo(
    () => moment().subtract(14, "days").startOf("day").toISOString(),
    []
  );

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["vetBookings", petIdFilter ?? "all", startAfterIso],
    queryFn: () =>
      fetchVetBookings({
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
    () => bookings.filter((b) => b.status === "pending_confirmation"),
    [bookings]
  );
  const active = useMemo(
    () => bookings.filter((b) => b.status === "confirmed"),
    [bookings]
  );

  const grouped = useMemo(() => groupByDay(active), [active]);

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmVetBookingImport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vetBookings"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => dismissVetBookingImport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vetBookings"] });
    },
  });

  const onAddToDevice = async (b: VetBookingRow) => {
    const start = new Date(b.start_utc);
    const end = new Date(b.end_utc);
    const ok = await addEventToDeviceCalendar({
      title: b.service_label ?? "Vet appointment",
      startDate: start,
      endDate: end,
      location: b.clinic_name,
      notes: b.notes,
    });
    if (ok) {
      Alert.alert("Calendar", "Event added to your calendar.");
    }
  };

  const renderRow = (b: VetBookingRow, showPet: boolean) => {
    const petLabel = b.pet_id ? petNameById.get(b.pet_id) : null;
    const timeRange = `${moment(b.start_utc).format("h:mm A")} – ${moment(b.end_utc).format("h:mm A")}`;
    const isEmailImport = b.booking_source === "email_ics";

    return (
      <View
        key={b.id}
        style={{
          marginBottom: 12,
          padding: 14,
          borderRadius: 14,
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        }}
      >
        <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: theme.foreground }}>
          {b.service_label ?? "Appointment"}
        </Text>
        <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 13, color: theme.secondary, marginTop: 4 }}>
          {timeRange}
          {b.clinic_name ? ` · ${b.clinic_name}` : ""}
        </Text>
        {showPet && petLabel ? (
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: theme.secondary, marginTop: 4 }}>
            {petLabel}
          </Text>
        ) : null}
        {isEmailImport && b.status === "pending_confirmation" ? (
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: "#B45309", marginTop: 6 }}>
            From email — confirm this time is correct
          </Text>
        ) : null}
        {b.status === "pending_confirmation" ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Pressable
              onPress={() => confirmMutation.mutate(b.id)}
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
              onPress={() => dismissMutation.mutate(b.id)}
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
        ) : (
          <Pressable
            onPress={() => onAddToDevice(b)}
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
        )}
      </View>
    );
  };

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

        <Pressable
          onPress={() => router.push("/(home)/book-vet-visit" as any)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            padding: 14,
            borderRadius: 14,
            backgroundColor: isDark ? "rgba(59,208,210,0.12)" : "rgba(59,208,210,0.15)",
            marginBottom: 20,
          }}
        >
          <Ionicons name="add-circle-outline" size={22} color="#3BD0D2" />
          <Text style={{ fontFamily: "Poppins_600SemiBold", color: theme.foreground, flex: 1 }}>
            Book a vet visit
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : bookings.length === 0 ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <Ionicons name="calendar-outline" size={48} color={theme.secondary} />
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                color: theme.secondary,
                textAlign: "center",
                marginTop: 16,
                paddingHorizontal: 24,
              }}
            >
              No appointments yet. Book in the app or confirm calendar invites sent to your pet’s
              inbox.
            </Text>
          </View>
        ) : null}

        {pending.length > 0 ? (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: theme.foreground, marginBottom: 10 }}>
              Needs confirmation
            </Text>
            {pending.map((b) => renderRow(b, true))}
          </View>
        ) : null}

        {grouped.length > 0 ? (
          <View>
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: theme.foreground, marginBottom: 10 }}>
              Schedule
            </Text>
            {grouped.map(([day, list]) => (
              <View key={day} style={{ marginBottom: 18 }}>
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 14,
                    color: theme.primary,
                    marginBottom: 8,
                  }}
                >
                  {moment(day, "YYYY-MM-DD").format("dddd, MMM D")}
                </Text>
                {list.map((b) => renderRow(b, !petIdFilter))}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <BottomNavBar activeTab="home" selectedPetId={selectedPetId ?? undefined} />
    </View>
  );
}
