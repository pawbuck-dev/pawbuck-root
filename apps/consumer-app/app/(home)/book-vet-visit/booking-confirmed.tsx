import BottomNavBar from "@/components/home/BottomNavBar";
import { VET_BOOKING_SERVICES_CATALOG } from "@/constants/vetBookingServices";
import { ALL_DEMO_VET_CLINICS } from "@/constants/mockVancouverVets";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import moment from "moment";
import { useMemo, useState } from "react";
import { Alert, Pressable, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function generateBookingNumber() {
  return `${Math.floor(10000000000 + Math.random() * 89999999999)}`;
}

function DashedSeparator({ color }: { color: string }) {
  const dots = 28;
  return (
    <View className="flex-row justify-center items-center py-1" style={{ overflow: "hidden" }}>
      {Array.from({ length: dots }).map((_, i) => (
        <View key={i} style={{ width: 5, height: 1.5, backgroundColor: color, marginHorizontal: 2, borderRadius: 1 }} />
      ))}
    </View>
  );
}

export default function BookingConfirmedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { pets } = usePets();
  const params = useLocalSearchParams<{
    vetId?: string;
    vetName?: string;
    petId?: string;
    serviceId?: string;
    date?: string;
    time?: string;
    bookingRef?: string;
    externalAppointmentId?: string;
    bookingRowId?: string;
    pawbuckAppointmentId?: string;
    source?: string;
  }>();

  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const vetId = one(params.vetId) ?? "";
  const vetNameParam = one(params.vetName) ?? "";
  const petId = one(params.petId) ?? "";
  const serviceId = one(params.serviceId) ?? "";
  const dateIso = one(params.date) ?? "";
  const timeLabel = one(params.time) ?? "";
  const paramRef = one(params.bookingRef);
  const externalId = one(params.externalAppointmentId);
  const rowId = one(params.bookingRowId);
  const [generatedRef] = useState(() => generateBookingNumber());
  /** Prefer vendor / API reference, then DB row id, then random demo ref. */
  const bookingRef =
    paramRef ?? externalId ?? (rowId ? rowId.replace(/-/g, "").slice(0, 12) : null) ?? generatedRef;

  const vet = useMemo(() => ALL_DEMO_VET_CLINICS.find((v) => v.id === vetId), [vetId]);
  const clinicName = vet?.name ?? vetNameParam ?? "Clinic";
  const locationLine = vet ? `${vet.address}, ${vet.city}` : "Vancouver, BC";

  const serviceLabel = useMemo(
    () => VET_BOOKING_SERVICES_CATALOG.find((s) => s.id === serviceId)?.label ?? "Service",
    [serviceId]
  );

  const petName = useMemo(() => pets.find((p) => p.id === petId)?.name ?? "Your pet", [pets, petId]);

  const datePretty = useMemo(() => {
    if (!dateIso) return "—";
    return moment(dateIso, "YYYY-MM-DD").format("dddd, MMMM D");
  }, [dateIso]);

  const shareSummary = useMemo(() => {
    return `PawBuck — Appointment confirmed\n${serviceLabel} at ${clinicName}\n${datePretty} · ${timeLabel}\nRef #${bookingRef}`;
  }, [serviceLabel, clinicName, datePretty, timeLabel, bookingRef]);

  const onShare = async () => {
    try {
      await Share.share({ message: shareSummary, title: "Appointment confirmed" });
    } catch {
      Alert.alert("Share", "Could not open share sheet.");
    }
  };

  const onDone = () => {
    router.replace("/(home)/home");
  };

  const onViewAppointments = () => {
    Alert.alert("Coming soon", "Your appointments list will live here.");
    router.replace("/(home)/home");
  };

  const cardBg = isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF";
  const mintTop = isDark ? "rgba(46, 125, 50, 0.25)" : "#E8F5E9";
  const dashColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)";
  const greenBadge = "#2E7D32";

  if (!dateIso || !timeLabel || !serviceId) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center mb-4" style={{ fontFamily: "Poppins_500Medium", color: theme.secondary }}>
            Missing appointment details.
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

      <View
        className="flex-row items-center justify-between px-4 pb-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "#FFFFFF",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <Ionicons name="arrow-back" size={22} color={theme.foreground} />
        </Pressable>
        <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 18, color: theme.foreground }}>Booked</Text>
        <Pressable
          onPress={() => void onShare()}
          hitSlop={8}
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "#FFFFFF",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <Ionicons name="share-outline" size={22} color={theme.foreground} />
        </Pressable>
      </View>

      <View className="flex-1 px-5 pt-4">
        <View
          className="rounded-3xl overflow-hidden mb-6"
          style={{
            backgroundColor: cardBg,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.08,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <View className="px-6 pt-8 pb-6 items-center" style={{ backgroundColor: mintTop }}>
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: greenBadge }}
            >
              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
            </View>
            <Text
              className="text-center text-lg mb-2"
              style={{ fontFamily: "Poppins_700Bold", color: theme.foreground }}
            >
              Appointment Confirmed!
            </Text>
            <Text
              className="text-center text-sm px-2"
              style={{ fontFamily: "Poppins_400Regular", color: theme.secondary, lineHeight: 20 }}
            >
              Your {serviceLabel.toLowerCase()} at {clinicName} has been successfully booked.
            </Text>
          </View>

          <DashedSeparator color={dashColor} />

          <View className="px-5 py-5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF" }}>
            {(
              [
                ["Pet Name", petName],
                ["Clinic", clinicName],
                ["Service", serviceLabel],
                ["Booking Number", `#${bookingRef}`],
                ["Date", datePretty],
                ["Time", timeLabel],
                ["Location", locationLine],
              ] as const
            ).map(([label, value]) => (
              <View key={label} className="flex-row justify-between py-2.5 border-b" style={{ borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }}>
                <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 14, color: theme.secondary }}>{label}</Text>
                <Text
                  className="flex-1 text-right ml-3"
                  style={{ fontFamily: "Poppins_600SemiBold", fontSize: 14, color: theme.foreground }}
                  numberOfLines={2}
                >
                  {value}
                </Text>
              </View>
            ))}

            <View className="flex-row items-center justify-between pt-4">
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 14, color: theme.secondary }}>Status</Text>
              <View
                className="flex-row items-center px-3 py-1.5 rounded-full"
                style={{ backgroundColor: isDark ? "rgba(46, 125, 50, 0.35)" : "rgba(46, 125, 50, 0.12)" }}
              >
                <Ionicons name="checkmark-circle" size={16} color={greenBadge} style={{ marginRight: 6 }} />
                <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: greenBadge }}>Confirmed</Text>
              </View>
            </View>
          </View>
        </View>

        <Pressable onPress={onDone} className="mb-3 overflow-hidden rounded-full" style={{ borderRadius: 999 }}>
          <LinearGradient
            colors={["#3BD0D2", "#2BA8AA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 16, alignItems: "center" }}
          >
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: "#FFFFFF" }}>Done</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={onViewAppointments}
          className="py-4 rounded-full items-center border"
          style={{
            borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)",
            backgroundColor: isDark ? "transparent" : "#FFFFFF",
          }}
        >
          <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: theme.foreground }}>
            View Appointments
          </Text>
        </Pressable>
      </View>

      <BottomNavBar activeTab="home" />
    </View>
  );
}
