import {
  PAWTHON_MAX_POINTS_PER_SESSION,
  PAWTHON_MIN_SEGMENT_METERS,
  PAWTHON_MIN_WALK_METERS,
} from "@/constants/pawthon";
import {
  formatDurationWalk,
  formatMiles,
  formatPace,
  metersToMiles,
  paceMinPerMile,
  PAWTHON_ORANGE_BANNER_BG,
  PAWTHON_ORANGE_BANNER_TEXT,
  PAWTHON_PEACH_CARD,
  PAWTHON_TEAL,
} from "@/constants/pawthonUi";
import { PawthonPetSelect } from "@/components/pawthon/PawthonPetSelect";
import { PawthonWalkMap, type PawthonMapCoord, type PawthonWalkMapRef } from "@/components/pawthon/PawthonWalkMap";
import type { Pet } from "@/context/petsContext";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { fetchPawthonDashboardStats, insertWalkSession, type WalkPoint } from "@/services/walkSessions";
import { supabase } from "@/utils/supabase";
import { haversineDistanceMeters } from "@/utils/haversine";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LatLng = { latitude: number; longitude: number };

type Phase = "select" | "active" | "complete";

type CompletePayload = {
  pet: Pet;
  distanceMeters: number;
  durationSec: number;
  path: PawthonMapCoord[];
  verificationUri: string | null;
  streak: number;
};

async function loadExpoLocation(): Promise<typeof import("expo-location")> {
  return import("expo-location");
}

export default function PawthonWalkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { pets } = usePets();
  const { selectedPetId, setSelectedPetId } = useSelectedPet();
  const queryClient = useQueryClient();
  const mapRef = useRef<PawthonWalkMapRef>(null);

  const [phase, setPhase] = useState<Phase>("select");
  const [walkPetId, setWalkPetId] = useState<string | null>(null);
  const [previewCoord, setPreviewCoord] = useState<PawthonMapCoord | null>(null);

  const [isWalking, setIsWalking] = useState(false);
  const [pathCoords, setPathCoords] = useState<PawthonMapCoord[]>([]);
  const pathCoordsRef = useRef<PawthonMapCoord[]>([]);
  const [distanceM, setDistanceM] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verificationUri, setVerificationUri] = useState<string | null>(null);
  const [complete, setComplete] = useState<CompletePayload | null>(null);

  const startedAtRef = useRef<Date | null>(null);
  const lastPosRef = useRef<LatLng | null>(null);
  const pointsRef = useRef<WalkPoint[]>([]);
  const distanceMRef = useRef(0);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const walkPet = pets.find((p) => p.id === walkPetId) ?? null;

  useEffect(() => {
    if (walkPetId) return;
    if (selectedPetId && pets.some((p) => p.id === selectedPetId)) {
      setWalkPetId(selectedPetId);
    } else if (pets[0]) {
      setWalkPetId(pets[0].id);
    }
  }, [selectedPetId, pets, walkPetId]);

  /** One-shot location for select-screen map preview */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const Location = await loadExpoLocation();
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          setPreviewCoord({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch {
        /* native module or permission */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearWalkTimers = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const stopTracking = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    clearWalkTimers();
  }, [clearWalkTimers]);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  const onLocation = useCallback((coords: LatLng) => {
    const t = Date.now();
    const last = lastPosRef.current;
    if (!last) {
      lastPosRef.current = coords;
      const p: WalkPoint = { lat: coords.latitude, lng: coords.longitude, t };
      pointsRef.current = [p];
      const first = { latitude: coords.latitude, longitude: coords.longitude };
      setPathCoords([first]);
      pathCoordsRef.current = [first];
      return;
    }

    const segment = haversineDistanceMeters(last, coords);
    if (segment < PAWTHON_MIN_SEGMENT_METERS) return;

    lastPosRef.current = coords;
    setDistanceM((prev) => {
      const next = prev + segment;
      distanceMRef.current = next;
      return next;
    });

    setPathCoords((prev) => {
      const next = [...prev, { latitude: coords.latitude, longitude: coords.longitude }];
      pathCoordsRef.current = next;
      return next;
    });

    if (pointsRef.current.length < PAWTHON_MAX_POINTS_PER_SESSION) {
      pointsRef.current.push({ lat: coords.latitude, lng: coords.longitude, t });
    }
  }, []);

  const beginWalkFromSelect = useCallback(async () => {
    if (!walkPetId) {
      Alert.alert("Select a pet", "Choose which pet you’re walking.");
      return;
    }
    setSelectedPetId(walkPetId);
    setVerificationUri(null);
    setPathCoords([]);
    pathCoordsRef.current = [];
    setDistanceM(0);
    setDurationSec(0);
    distanceMRef.current = 0;
    pointsRef.current = [];
    lastPosRef.current = null;

    let Location: typeof import("expo-location");
    try {
      Location = await loadExpoLocation();
    } catch (e) {
      console.warn("[PawthonWalk] expo-location failed to load", e);
      Alert.alert(
        "Rebuild the app for GPS",
        "This install doesn’t include the location native module.\n\nFrom apps/consumer-app:\n  pnpm prebuild:clean\n  pnpm ios"
      );
      return;
    }

    setPermissionDenied(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setPermissionDenied(true);
      Alert.alert(
        "Location needed",
        "Pawthon uses your location while the app is open to measure walk distance."
      );
      return;
    }

    startedAtRef.current = new Date();
    setIsWalking(true);
    setPhase("active");

    tickRef.current = setInterval(() => {
      if (startedAtRef.current) {
        setDurationSec(Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000));
      }
    }, 1000);

    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 2500,
          distanceInterval: 5,
        },
        (loc) => onLocation(loc.coords)
      );
      subscriptionRef.current = sub;
    } catch (e) {
      console.warn("[PawthonWalk] watchPositionAsync", e);
      setIsWalking(false);
      setPhase("select");
      stopTracking();
      Alert.alert("Location error", "Could not start GPS updates. Try again.");
    }
  }, [walkPetId, setSelectedPetId, onLocation, stopTracking]);

  const endWalk = useCallback(async () => {
    if (!isWalking) return;
    stopTracking();
    setIsWalking(false);

    const petId = walkPetId;
    const startedAt = startedAtRef.current;
    const endedAt = new Date();
    const meters = distanceMRef.current;
    const points = [...pointsRef.current];
    const pathSnapshot = [...pathCoordsRef.current];

    startedAtRef.current = null;
    lastPosRef.current = null;
    pointsRef.current = [];

    if (!petId || !startedAt || !walkPet) {
      setPhase("select");
      return;
    }

    if (meters < PAWTHON_MIN_WALK_METERS) {
      Alert.alert(
        "Walk too short",
        `Walk at least ${PAWTHON_MIN_WALK_METERS}m to save a session.`
      );
      distanceMRef.current = 0;
      setDistanceM(0);
      setDurationSec(0);
      setPathCoords([]);
      pathCoordsRef.current = [];
      setPhase("select");
      return;
    }

    setSaving(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        Alert.alert("Sign in required", "Log in again to save your walk.");
        setSaving(false);
        setPhase("select");
        return;
      }

      const result = await insertWalkSession({
        userId: userData.user.id,
        petId,
        startedAt,
        endedAt,
        distanceMeters: meters,
        durationSeconds: Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000),
        points,
      });

      if (!result) {
        Alert.alert("Could not save", "Check your connection and try again.");
        setSaving(false);
        setPhase("select");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["pawthon", petId] });
      const stats = await queryClient.fetchQuery({
        queryKey: ["pawthon", petId],
        queryFn: () => fetchPawthonDashboardStats(petId),
      });

      const dur = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
      setComplete({
        pet: walkPet,
        distanceMeters: meters,
        durationSec: dur,
        path: pathSnapshot.length >= 2 ? pathSnapshot : pathSnapshot.length === 1 ? [...pathSnapshot, ...pathSnapshot] : [],
        verificationUri,
        streak: stats.streak,
      });
      setPhase("complete");
      distanceMRef.current = 0;
      setDistanceM(0);
      setDurationSec(0);
      setPathCoords([]);
      pathCoordsRef.current = [];
    } finally {
      setSaving(false);
    }
  }, [isWalking, stopTracking, walkPetId, walkPet, verificationUri, queryClient]);

  const openVerificationCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera", "Allow camera to attach a walk photo.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setVerificationUri(res.assets[0].uri);
    }
  }, []);

  const milesNow = metersToMiles(distanceM);
  const paceStr = formatPace(paceMinPerMile(durationSec, milesNow));

  const mapPreview =
    previewCoord ? (
      <PawthonWalkMap path={[previewCoord]} style={{ flex: 1 }} showUserLocation />
    ) : null;

  const headerBack = (options?: { confirmIfWalking?: boolean }) => (
    <Pressable
      onPress={() => {
        if (options?.confirmIfWalking && isWalking) {
          Alert.alert("End walk?", "Discard this walk or tap Stop to save.", [
            { text: "Keep walking", style: "cancel" },
            {
              text: "Discard",
              style: "destructive",
              onPress: () => {
                stopTracking();
                setIsWalking(false);
                startedAtRef.current = null;
                lastPosRef.current = null;
                pointsRef.current = [];
                distanceMRef.current = 0;
                setDistanceM(0);
                setDurationSec(0);
                setPathCoords([]);
                pathCoordsRef.current = [];
                setPhase("select");
              },
            },
          ]);
        } else if (phase === "complete") {
          setComplete(null);
          router.back();
        } else if (phase === "active") {
          stopTracking();
          setIsWalking(false);
          startedAtRef.current = null;
          lastPosRef.current = null;
          pointsRef.current = [];
          distanceMRef.current = 0;
          setDistanceM(0);
          setDurationSec(0);
          setPathCoords([]);
          pathCoordsRef.current = [];
          setPhase("select");
        } else {
          router.back();
        }
      }}
      hitSlop={12}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: phase === "active" ? "rgba(255,255,255,0.95)" : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name="chevron-back"
        size={26}
        color={phase === "active" ? "#111" : theme.primary}
      />
    </Pressable>
  );

  if (pets.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          paddingTop: insets.top,
          paddingHorizontal: 24,
          justifyContent: "center",
        }}
      >
        <Text style={{ fontFamily: "Poppins_500Medium", color: theme.foreground }}>
          Add a pet first, then start a walk from Home.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: "Poppins_600SemiBold", color: theme.primary }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  /* ——— Walk complete ——— */
  if (phase === "complete" && complete) {
    const mi = metersToMiles(complete.distanceMeters);
    const verified = complete.verificationUri ? 1 : 0;
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
            {headerBack()}
          </View>

          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: theme.card,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 36 }}>🎉</Text>
            </View>
            <Text
              style={{
                fontFamily: "Poppins_700Bold",
                fontSize: 26,
                color: theme.foreground,
              }}
            >
              Walk Complete!
            </Text>
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                fontSize: 15,
                color: theme.secondary,
                marginTop: 4,
              }}
            >
              Great job out there
            </Text>
          </View>

          <View
            style={{
              height: 200,
              borderRadius: 20,
              overflow: "hidden",
              marginBottom: 20,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <PawthonWalkMap
              path={
                complete.path.length >= 2
                  ? complete.path
                  : complete.path[0]
                    ? [complete.path[0], complete.path[0]]
                    : []
              }
              style={{ flex: 1 }}
              showUserLocation={false}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Distance", value: formatMiles(mi), unit: "Miles" },
              { label: "Duration", value: formatDurationWalk(complete.durationSec), unit: "" },
              {
                label: "Verification",
                value: String(verified),
                unit: verified ? "Verified" : "None",
              },
            ].map((cell) => (
              <View
                key={cell.label}
                style={{
                  flex: 1,
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_700Bold",
                    fontSize: 16,
                    color: theme.foreground,
                    textAlign: "center",
                  }}
                >
                  {cell.value}
                  {cell.unit ? (
                    <Text
                      style={{
                        fontFamily: "Poppins_500Medium",
                        fontSize: 12,
                        color: theme.secondary,
                      }}
                    >
                      {" "}
                      {cell.unit}
                    </Text>
                  ) : null}
                </Text>
                <Text
                  style={{
                    fontFamily: "Poppins_500Medium",
                    fontSize: 12,
                    color: theme.secondary,
                    marginTop: 6,
                  }}
                >
                  {cell.label}
                </Text>
              </View>
            ))}
          </View>

          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 15,
              color: theme.foreground,
              marginBottom: 8,
            }}
          >
            {complete.pet.name}
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_500Medium",
              fontSize: 13,
              color: theme.secondary,
              marginBottom: 8,
            }}
          >
            Verification photo
          </Text>
          {complete.verificationUri ? (
            <Image
              source={{ uri: complete.verificationUri }}
              style={{
                width: "100%",
                height: 160,
                borderRadius: 14,
                marginBottom: 24,
              }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                height: 100,
                borderRadius: 14,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <Text style={{ color: theme.secondary, fontFamily: "Poppins_500Medium" }}>
                No photo this time
              </Text>
            </View>
          )}

          <Text
            style={{
              fontFamily: "Poppins_700Bold",
              fontSize: 17,
              color: theme.foreground,
              marginBottom: 12,
            }}
          >
            Achievements
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            <LinearGradient
              colors={["#FFE5B4", "#FFD54F"]}
              style={{ flex: 1, borderRadius: 16, padding: 14 }}
            >
              <Ionicons name="flame" size={22} color="#E65100" />
              <Text
                style={{
                  fontFamily: "Poppins_700Bold",
                  fontSize: 15,
                  color: "#5D4037",
                  marginTop: 8,
                }}
              >
                {complete.streak >= 2 ? `${complete.streak}-Day Streak!` : "Keep the streak!"}
              </Text>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: "#6D4C41", marginTop: 4 }}>
                {complete.streak >= 2
                  ? "You’re on a roll"
                  : "Walk again tomorrow to start a streak"}
              </Text>
            </LinearGradient>
            <LinearGradient
              colors={["#C8E6C9", "#81C784"]}
              style={{ flex: 1, borderRadius: 16, padding: 14 }}
            >
              <Ionicons name="trending-up" size={22} color="#2E7D32" />
              <Text
                style={{
                  fontFamily: "Poppins_700Bold",
                  fontSize: 15,
                  color: "#1B5E20",
                  marginTop: 8,
                }}
              >
                Leaderboard
              </Text>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: "#2E7D32", marginTop: 4 }}>
                City ranks coming soon
              </Text>
            </LinearGradient>
          </View>

          <View
            style={{
              backgroundColor: PAWTHON_PEACH_CARD,
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "rgba(255,255,255,0.8)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="paw" size={26} color={PAWTHON_TEAL} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 17, color: "#3E2723" }}>
                Pawthon challenge
              </Text>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 13, color: "#5D4037", marginTop: 2 }}>
                Weekly distance & city leaders · soon
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              setComplete(null);
              router.back();
            }}
            style={{ marginBottom: 12 }}
          >
            <LinearGradient
              colors={[PAWTHON_TEAL, PAWTHON_TEAL]}
              style={{
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 17, color: "#FFFFFF" }}>Done</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => {
              Share.share({
                message: `I walked ${formatMiles(mi)} mi with ${complete.pet.name} on PawBuck Pawthon! 🐾`,
              }).catch(() => {});
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
            }}
          >
            <Ionicons name="share-outline" size={20} color={theme.foreground} style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: theme.foreground }}>
              Share Walk Card
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  /* ——— Active walk (map + sheet) ——— */
  if (phase === "active") {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <StatusBar style="light" />
        <PawthonWalkMap ref={mapRef} path={pathCoords} style={{ flex: 1 }} showUserLocation />

        <View
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            zIndex: 10,
          }}
        >
          {headerBack({ confirmIfWalking: true })}
        </View>

        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingBottom: Math.max(insets.bottom, 12),
            paddingTop: 20,
            paddingHorizontal: 16,
            backgroundColor: theme.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 16,
          }}
        >
          <Text
            style={{
              fontFamily: "Poppins_700Bold",
              fontSize: 36,
              color: theme.foreground,
              textAlign: "center",
            }}
          >
            {formatMiles(milesNow)}{" "}
            <Text style={{ fontSize: 18, color: theme.secondary }}>mi</Text>
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 14,
              color: PAWTHON_TEAL,
              textAlign: "center",
              marginTop: 4,
              marginBottom: 16,
            }}
          >
            Capture in Progress
          </Text>

          <View style={{ flexDirection: "row", marginBottom: 14 }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 18, color: theme.foreground }}>
                {formatMiles(milesNow)}
              </Text>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: theme.secondary, marginTop: 4 }}>
                Distance
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 18, color: theme.foreground }}>
                {paceStr}
              </Text>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: theme.secondary, marginTop: 4 }}>
                avg pace (min/mi)
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 18, color: theme.foreground }}>
                {Math.floor(durationSec / 60)}:
                {String(durationSec % 60).padStart(2, "0")}
              </Text>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: theme.secondary, marginTop: 4 }}>
                Duration
              </Text>
            </View>
          </View>

          {permissionDenied ? null : (
            <View
              style={{
                backgroundColor: PAWTHON_ORANGE_BANNER_BG,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 20,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 13,
                  color: PAWTHON_ORANGE_BANNER_TEXT,
                  textAlign: "center",
                }}
              >
                Take a live photo to verify & finish walk
              </Text>
            </View>
          )}

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable
              onPress={openVerificationCamera}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="camera" size={24} color={theme.foreground} />
            </Pressable>

            <Pressable
              onPress={endWalk}
              disabled={saving}
              style={{ flex: 1, marginHorizontal: 12 }}
            >
              <LinearGradient
                colors={[PAWTHON_TEAL, "#1FA8A8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 16,
                  borderRadius: 28,
                  opacity: saving ? 0.75 : 1,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="pause" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 17, color: "#FFFFFF" }}>Stop</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => {
                const last = pathCoords[pathCoords.length - 1];
                if (last) mapRef.current?.recenter(last, 17);
              }}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="locate" size={24} color={theme.foreground} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  /* ——— Select pet ——— */
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ position: "absolute", left: 16, top: insets.top + 8 }}>{headerBack()}</View>
        <Text
          style={{
            fontFamily: "Poppins_700Bold",
            fontSize: 18,
            color: theme.foreground,
          }}
        >
          Start-Walk
        </Text>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <PawthonPetSelect
          pets={pets}
          selectedPetId={walkPetId}
          onSelectPetId={setWalkPetId}
          onStartWalk={beginWalkFromSelect}
          mapPreview={mapPreview ?? undefined}
        />
      </View>
    </View>
  );
}
