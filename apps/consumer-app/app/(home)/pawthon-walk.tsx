import {
  PAWTHON_MAX_POINTS_PER_SESSION,
  PAWTHON_MIN_SEGMENT_METERS,
  PAWTHON_MIN_WALK_METERS,
} from "@/constants/pawthon";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { insertWalkSession, type WalkPoint } from "@/services/walkSessions";
import { supabase } from "@/utils/supabase";
import { haversineDistanceMeters } from "@/utils/haversine";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LatLng = { latitude: number; longitude: number };

/** Lazy-loaded so the screen works before a native rebuild; dev client must include expo-location. */
async function loadExpoLocation(): Promise<typeof import("expo-location")> {
  return import("expo-location");
}

export default function PawthonWalkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { selectedPet, selectedPetId } = useSelectedPet();
  const queryClient = useQueryClient();

  const [isWalking, setIsWalking] = useState(false);
  const [distanceM, setDistanceM] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [saving, setSaving] = useState(false);

  const startedAtRef = useRef<Date | null>(null);
  const lastPosRef = useRef<LatLng | null>(null);
  const pointsRef = useRef<WalkPoint[]>([]);
  const distanceMRef = useRef(0);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    if (pointsRef.current.length < PAWTHON_MAX_POINTS_PER_SESSION) {
      pointsRef.current.push({ lat: coords.latitude, lng: coords.longitude, t });
    }
  }, []);

  const startWalk = useCallback(async () => {
    if (!selectedPetId) {
      Alert.alert("Select a pet", "Choose a pet on the home screen first.");
      return;
    }

    let Location: typeof import("expo-location");
    try {
      Location = await loadExpoLocation();
    } catch (e) {
      console.warn("[PawthonWalk] expo-location failed to load", e);
      Alert.alert(
        "Rebuild the app for GPS",
        "This install doesn’t include the location native module (common after adding expo-location).\n\nFrom apps/consumer-app:\n  pnpm prebuild:clean\n  pnpm ios\n\nThen open the new build."
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
    lastPosRef.current = null;
    pointsRef.current = [];
    distanceMRef.current = 0;
    setDistanceM(0);
    setDurationSec(0);
    setIsWalking(true);

    tickRef.current = setInterval(() => {
      if (startedAtRef.current) {
        setDurationSec(
          Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000)
        );
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
      stopTracking();
      Alert.alert("Location error", "Could not start GPS updates. Try again.");
    }
  }, [selectedPetId, onLocation, stopTracking]);

  const endWalk = useCallback(async () => {
    if (!isWalking) return;

    stopTracking();
    setIsWalking(false);

    const petId = selectedPetId;
    const startedAt = startedAtRef.current;
    const endedAt = new Date();
    const meters = distanceMRef.current;
    const points = [...pointsRef.current];

    startedAtRef.current = null;
    lastPosRef.current = null;
    pointsRef.current = [];

    if (!petId || !startedAt) return;

    if (meters < PAWTHON_MIN_WALK_METERS) {
      Alert.alert(
        "Walk too short",
        `Walk at least ${PAWTHON_MIN_WALK_METERS}m to save a session.`
      );
      distanceMRef.current = 0;
      setDistanceM(0);
      setDurationSec(0);
      return;
    }

    setSaving(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        Alert.alert("Sign in required", "Log in again to save your walk.");
        setSaving(false);
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
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["pawthon", petId] });
      distanceMRef.current = 0;
      setDistanceM(0);
      setDurationSec(0);
      router.back();
    } finally {
      setSaving(false);
    }
  }, [isWalking, stopTracking, selectedPetId, queryClient, router]);

  const km = distanceM / 1000;
  const fmtDur = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`;

  if (!selectedPet) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          paddingTop: insets.top,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Text style={{ color: theme.foreground, fontFamily: "Poppins_500Medium" }}>
          Select a pet on Home, then open Pawthon again.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: theme.primary, fontFamily: "Poppins_600SemiBold" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => {
            if (isWalking) {
              Alert.alert(
                "End walk?",
                "Stop tracking and discard this walk, or use End walk to save.",
                [
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
                      router.back();
                    },
                  },
                ]
              );
            } else {
              router.back();
            }
          }}
          hitSlop={12}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Ionicons name="chevron-back" size={28} color={theme.primary} />
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 16,
              color: theme.primary,
              marginLeft: 4,
            }}
          >
            Back
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <Text
          style={{
            fontFamily: "Poppins_700Bold",
            fontSize: 28,
            color: theme.foreground,
            marginBottom: 4,
          }}
        >
          Pawthon
        </Text>
        <Text
          style={{
            fontFamily: "Poppins_500Medium",
            fontSize: 15,
            color: theme.secondary,
            marginBottom: 32,
          }}
        >
          Walking with {selectedPet.name}
        </Text>

        {permissionDenied && (
          <View
            style={{
              padding: 14,
              borderRadius: 14,
              backgroundColor: isDark ? "rgba(255,180,100,0.12)" : "#FFF3E0",
              marginBottom: 20,
            }}
          >
            <Text style={{ fontFamily: "Poppins_500Medium", color: theme.foreground }}>
              Location permission is off. Enable it in Settings to track walks.
            </Text>
          </View>
        )}

        <View
          style={{
            borderRadius: 20,
            paddingVertical: 28,
            paddingHorizontal: 20,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 28,
          }}
        >
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 12,
              letterSpacing: 1,
              color: theme.secondary,
              marginBottom: 8,
            }}
          >
            DISTANCE
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_700Bold",
              fontSize: 44,
              color: theme.foreground,
            }}
          >
            {km < 10 ? km.toFixed(2) : km.toFixed(1)}{" "}
            <Text style={{ fontSize: 22, color: theme.secondary }}>km</Text>
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_500Medium",
              fontSize: 16,
              color: theme.secondary,
              marginTop: 16,
            }}
          >
            Time {fmtDur}
          </Text>
        </View>

        {!isWalking ? (
          <Pressable
            onPress={startWalk}
            disabled={saving}
            style={{
              backgroundColor: theme.primary,
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: "center",
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 17, color: "#FFFFFF" }}>
              Start walk
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={endWalk}
            disabled={saving}
            style={{
              backgroundColor: isDark ? "#C62828" : "#D32F2F",
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="stop-circle" size={24} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 17, color: "#FFFFFF" }}>
                  End walk & save
                </Text>
              </>
            )}
          </Pressable>
        )}

        <Text
          style={{
            fontFamily: "Poppins_400Regular",
            fontSize: 13,
            color: theme.secondary,
            marginTop: 20,
            lineHeight: 20,
          }}
        >
          Keep this screen open while you walk. We only use location in the foreground for the MVP.
        </Text>
      </View>
    </View>
  );
}
