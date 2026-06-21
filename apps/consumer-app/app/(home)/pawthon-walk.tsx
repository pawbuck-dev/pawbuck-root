import PrivateImage from "@/components/common/PrivateImage";
import { PawthonBadgeUnlockCard } from "@/components/pawthon/PawthonBadgeUnlockCard";
import { PawthonCountdownOverlay } from "@/components/pawthon/PawthonCountdownOverlay";
import { PawthonWalkSharePreviewModal } from "@/components/pawthon/PawthonWalkSharePreviewModal";
import type { PawthonBadgeId } from "@/constants/pawthonBadges";
import {
  PAWTHON_COUNTDOWN_SECONDS,
  PAWTHON_COUNTDOWN_SKIP_KEY,
} from "@/constants/pawthonCountdown";
import {
  PAWTHON_MAX_POINTS_PER_SESSION,
  PAWTHON_MIN_SEGMENT_METERS,
  PAWTHON_MIN_WALK_METERS,
} from "@/constants/pawthon";
import { PAWTHON_WARMUP_TARGET_ACCURACY_M, PAWTHON_WARMUP_TIMEOUT_MS } from "@/constants/pawthonWalkTracking";
import {
  formatDurationWalk,
  formatMiles,
  formatPace,
  metersToMiles,
  paceMinPerMile,
  PAWTHON_PEACH_CARD,
  PAWTHON_TEAL,
} from "@/constants/pawthonUi";
import { PawthonPetSelect } from "@/components/pawthon/PawthonPetSelect";
import { PawthonWalkMap, type PawthonMapCoord, type PawthonWalkMapRef } from "@/components/pawthon/PawthonWalkMap";
import type { Pet } from "@/context/petsContext";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { resetPawthonGapAnchor } from "@/services/pawthonWalkGapFill";
import {
  deactivatePawthonWalkSessionBridge,
  getPawthonWalkSnapshot,
  resetPawthonWalkSessionBridge,
  subscribePawthonWalkSession,
} from "@/services/pawthonWalkSessionBridge";
import {
  startPawthonWalkTracking,
  stopPawthonWalkTracking,
  type PawthonWalkTrackingMode,
} from "@/services/pawthonWalkTracking";
import { captureWalkMapSnapshot } from "@/services/walkShare";
import {
  ensureWalkForegroundLocation,
  getWalkBackgroundPermissionStatus,
  hasSeenPawthonAlwaysExplainer,
  markPawthonAlwaysExplainerSeen,
  requestWalkBackgroundLocation,
} from "@/services/walkLocationPermissions";
import { getDailyGoalMeters } from "@/services/pawthonGoalPrefs";
import { formatWeeklyWalkerRankLine } from "@/services/walkMetrics";
import { processBadgesAfterWalk } from "@/services/pawthonBadges";
import {
  fetchMyWeeklyWalkerRankForCountry,
  fetchPawthonDashboardStats,
  insertWalkSessionsForPets,
  type WalkPoint,
} from "@/services/walkSessions";
import { buildWalkSharePayloadFromComplete } from "@/utils/buildWalkSharePayload";
import {
  isAutoStartRequested,
  parseAutoStartPetId,
  shouldAutoStartWalk,
} from "@/utils/pawthonWalkAutoStart";
import { formatWalkPetNames, toggleWalkPetId } from "@/utils/pawthonWalkPets";
import { supabase } from "@/utils/supabase";
import type { WalkSharePayload } from "@/utils/walkShareCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { haversineDistanceMeters } from "@/utils/haversine";
import {
  buildSimulatedWalkPath,
  pathLengthMeters,
  PAWTHON_SIM_DEFAULT_START,
} from "@/utils/simulateWalkPath";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type LatLng = { latitude: number; longitude: number };

type Phase = "select" | "warmup" | "countdown" | "active" | "complete";

type CompletePayload = {
  pets: Pet[];
  distanceMeters: number;
  durationSec: number;
  path: PawthonMapCoord[];
  verificationUri: string | null;
  streak: number;
  newBadges: PawthonBadgeId[];
  sessionId: string | null;
  endedAt: string;
  weeklyRankLine?: string;
};

async function loadExpoLocation(): Promise<typeof import("expo-location")> {
  return import("expo-location");
}

export default function PawthonWalkScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ autoStart?: string; petId?: string }>();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { pets } = usePets();
  const { selectedPetId, setSelectedPetId } = useSelectedPet();
  const queryClient = useQueryClient();
  const mapRef = useRef<PawthonWalkMapRef>(null);
  const completeMapCaptureRef = useRef<View>(null);
  const trackingModeRef = useRef<PawthonWalkTrackingMode>("foreground");

  const [phase, setPhase] = useState<Phase>("select");
  const [walkPetIds, setWalkPetIds] = useState<string[]>([]);
  const autoStartHandledRef = useRef(false);
  const [previewCoord, setPreviewCoord] = useState<PawthonMapCoord | null>(null);

  const [isWalking, setIsWalking] = useState(false);
  const isWalkingRef = useRef(false);
  const [isSimulatedWalk, setIsSimulatedWalk] = useState(false);
  const isSimulatedWalkRef = useRef(false);
  const [alwaysExplainerOpen, setAlwaysExplainerOpen] = useState(false);
  const [warmupWeakGps, setWarmupWeakGps] = useState(false);
  const [warmupElapsedSec, setWarmupElapsedSec] = useState(0);
  const [warmupAccuracy, setWarmupAccuracy] = useState<number | null>(null);
  const [sessionSteps, setSessionSteps] = useState(0);
  const pedometerBaselineRef = useRef<number | null>(null);
  const [pathCoords, setPathCoords] = useState<PawthonMapCoord[]>([]);
  const pathCoordsRef = useRef<PawthonMapCoord[]>([]);
  const [distanceM, setDistanceM] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [saving, setSaving] = useState(false);
  const [verificationUri, setVerificationUri] = useState<string | null>(null);
  const [complete, setComplete] = useState<CompletePayload | null>(null);
  const [sharePreviewPayload, setSharePreviewPayload] = useState<WalkSharePayload | null>(null);
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const [countdownIndex, setCountdownIndex] = useState(0);
  const [countdownGo, setCountdownGo] = useState(false);
  const countdownPendingWeakGpsRef = useRef(false);

  const startedAtRef = useRef<Date | null>(null);
  const lastPosRef = useRef<LatLng | null>(null);
  const pointsRef = useRef<WalkPoint[]>([]);
  const distanceMRef = useRef(0);
  const warmupSubRef = useRef<{ remove: () => void } | null>(null);
  const warmupTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** __DEV__ simulated GPS playback */
  const simPlaybackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const walkPets = pets.filter((p) => walkPetIds.includes(p.id));
  const walkPetLabel = formatWalkPetNames(walkPets);

  useEffect(() => {
    if (walkPetIds.length > 0) return;
    const paramPetId = parseAutoStartPetId(searchParams);
    if (paramPetId && pets.some((p) => p.id === paramPetId)) {
      setWalkPetIds([paramPetId]);
      return;
    }
    if (selectedPetId && pets.some((p) => p.id === selectedPetId)) {
      setWalkPetIds([selectedPetId]);
    } else if (pets[0]) {
      setWalkPetIds([pets[0].id]);
    }
  }, [selectedPetId, pets, walkPetIds.length, searchParams]);

  useEffect(() => {
    isWalkingRef.current = isWalking;
  }, [isWalking]);

  useEffect(() => {
    isSimulatedWalkRef.current = isSimulatedWalk;
  }, [isSimulatedWalk]);

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
    if (warmupTickerRef.current) {
      clearInterval(warmupTickerRef.current);
      warmupTickerRef.current = null;
    }
  }, []);

  const stopTracking = useCallback(async () => {
    warmupSubRef.current?.remove();
    warmupSubRef.current = null;
    if (simPlaybackRef.current) {
      clearInterval(simPlaybackRef.current);
      simPlaybackRef.current = null;
    }
    clearWalkTimers();
    await stopPawthonWalkTracking();
    deactivatePawthonWalkSessionBridge();
    resetPawthonGapAnchor();
  }, [clearWalkTimers]);

  useEffect(() => {
    return () => {
      void stopTracking();
    };
  }, [stopTracking]);

  useEffect(() => {
    if (phase !== "active" || isSimulatedWalk) return;
    const syncFromBridge = () => {
      const s = getPawthonWalkSnapshot();
      pathCoordsRef.current = s.pathCoords;
      pointsRef.current = s.points;
      distanceMRef.current = s.distanceM;
      setPathCoords(s.pathCoords);
      setDistanceM(s.distanceM);
    };
    syncFromBridge();
    return subscribePawthonWalkSession(syncFromBridge);
  }, [phase, isSimulatedWalk]);

  useEffect(() => {
    if (phase !== "active" || isSimulatedWalk) {
      pedometerBaselineRef.current = null;
      setSessionSteps(0);
      return;
    }
    let removed = false;
    let sub: { remove: () => void } | null = null;
    (async () => {
      try {
        const { Pedometer } = await import("expo-sensors");
        const avail = await Pedometer.isAvailableAsync();
        if (!avail || removed) return;
        const perm = await Pedometer.getPermissionsAsync();
        if (perm.status !== "granted" || removed) return;
        sub = Pedometer.watchStepCount((ev) => {
          if (pedometerBaselineRef.current == null) {
            pedometerBaselineRef.current = ev.steps;
          }
          setSessionSteps(Math.max(0, ev.steps - pedometerBaselineRef.current));
        });
      } catch {
        /* pedometer optional */
      }
    })();
    return () => {
      removed = true;
      sub?.remove();
    };
  }, [phase, isSimulatedWalk]);

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

  const activateWalkTracking = useCallback(async (): Promise<boolean> => {
    try {
      await startPawthonWalkTracking(trackingModeRef.current);
      return true;
    } catch (e) {
      console.warn("[PawthonWalk] start tracking", e);
      await stopPawthonWalkTracking();
      deactivatePawthonWalkSessionBridge();
      resetPawthonGapAnchor();
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      setIsWalking(false);
      setPhase("select");
      startedAtRef.current = null;
      const isBackground = trackingModeRef.current === "background";
      Alert.alert(
        "Location error",
        isBackground
          ? "Could not start GPS tracking. Use a development or production build with native location (Expo Go does not support background walk tracking)."
          : "Could not start GPS tracking. Check location permissions in Settings."
      );
      return false;
    }
  }, []);

  const startWarmup = useCallback(async (Location: typeof import("expo-location")) => {
    warmupSubRef.current?.remove();
    warmupSubRef.current = null;
    setPhase("warmup");
    setWarmupWeakGps(false);
    setWarmupAccuracy(null);
    setWarmupElapsedSec(0);
    const warmStart = Date.now();
    warmupTickerRef.current = setInterval(() => {
      setWarmupElapsedSec(Math.floor((Date.now() - warmStart) / 1000));
    }, 400);

    let finished = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const beginActiveTracking = async (weak: boolean) => {
      setWarmupWeakGps(weak);
      resetPawthonGapAnchor();
      resetPawthonWalkSessionBridge();

      startedAtRef.current = new Date();
      setIsWalking(true);
      setPhase("active");
      tickRef.current = setInterval(() => {
        if (startedAtRef.current) {
          setDurationSec(Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000));
        }
      }, 1000);

      await activateWalkTracking();
    };

    const finishWarmup = async (weak: boolean) => {
      if (finished) return;
      finished = true;
      if (timeoutId != null) clearTimeout(timeoutId);
      warmupSubRef.current?.remove();
      warmupSubRef.current = null;
      if (warmupTickerRef.current) {
        clearInterval(warmupTickerRef.current);
        warmupTickerRef.current = null;
      }

      const skip = await AsyncStorage.getItem(PAWTHON_COUNTDOWN_SKIP_KEY);
      if (skip === "1") {
        await beginActiveTracking(weak);
        return;
      }

      countdownPendingWeakGpsRef.current = weak;
      setCountdownIndex(0);
      setCountdownGo(false);
      setPhase("countdown");
    };

    timeoutId = setTimeout(() => {
      void finishWarmup(true);
    }, PAWTHON_WARMUP_TIMEOUT_MS);

    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 800,
          distanceInterval: 0,
        },
        (loc) => {
          const acc = loc.coords.accuracy ?? 999;
          setWarmupAccuracy(acc);
          if (acc > 0 && acc <= PAWTHON_WARMUP_TARGET_ACCURACY_M) {
            void finishWarmup(false);
          }
        }
      );
      warmupSubRef.current = sub;
    } catch (e) {
      console.warn("[PawthonWalk] warmup watchPositionAsync", e);
      void finishWarmup(true);
    }
  }, [activateWalkTracking]);

  const beginActiveFromCountdown = useCallback(async () => {
    const weak = countdownPendingWeakGpsRef.current;
    setCountdownGo(false);
    setCountdownIndex(0);
    await (async () => {
      resetPawthonGapAnchor();
      resetPawthonWalkSessionBridge();
      startedAtRef.current = new Date();
      setIsWalking(true);
      setPhase("active");
      setWarmupWeakGps(weak);
      tickRef.current = setInterval(() => {
        if (startedAtRef.current) {
          setDurationSec(Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000));
        }
      }, 1000);
      await activateWalkTracking();
    })();
  }, [activateWalkTracking]);

  const skipCountdownAndStart = useCallback(async () => {
    await AsyncStorage.setItem(PAWTHON_COUNTDOWN_SKIP_KEY, "1");
    await beginActiveFromCountdown();
  }, [beginActiveFromCountdown]);

  useEffect(() => {
    if (phase !== "countdown" || countdownGo) return;

    const sequence = PAWTHON_COUNTDOWN_SECONDS;
    if (countdownIndex >= sequence.length) {
      setCountdownGo(true);
      return;
    }

    const t = setTimeout(() => {
      setCountdownIndex((i) => i + 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, countdownIndex, countdownGo]);

  useEffect(() => {
    if (phase !== "countdown" || !countdownGo) return;

    const t = setTimeout(() => {
      void beginActiveFromCountdown();
    }, 700);
    return () => clearTimeout(t);
  }, [phase, countdownGo, beginActiveFromCountdown]);

  const beginWalkFromSelect = useCallback(async () => {
    if (walkPetIds.length === 0) {
      Alert.alert("Select a pet", "Choose at least one pet for this walk.");
      return;
    }
    setIsSimulatedWalk(false);
    setSelectedPetId(walkPetIds[0]!);
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

    const fg = await ensureWalkForegroundLocation(Location);
    if (!fg.granted) {
      Alert.alert(
        "Location needed",
        fg.status === "denied"
          ? "Pawthon uses your location to map walks with your pet. Turn on location for PawBuck in Settings when you're ready."
          : "Pawthon uses your location to map walks with your pet. You can allow location in Settings when you're ready."
      );
      return;
    }

    try {
      const { Pedometer } = await import("expo-sensors");
      const avail = await Pedometer.isAvailableAsync().catch(() => false);
      if (avail) {
        await Pedometer.requestPermissionsAsync().catch(() => {});
      }
    } catch {
      /* motion optional */
    }

    const bg = await getWalkBackgroundPermissionStatus(Location);
    trackingModeRef.current = bg.granted ? "background" : "foreground";
    if (bg.granted) {
      await startWarmup(Location);
      return;
    }

    const seen = await hasSeenPawthonAlwaysExplainer();
    if (!seen) {
      setAlwaysExplainerOpen(true);
      return;
    }

    await startWarmup(Location);
  }, [walkPetIds, setSelectedPetId, startWarmup]);

  useEffect(() => {
    if (
      !shouldAutoStartWalk({
        autoStart: searchParams,
        phase,
        walkPetIds,
        alreadyHandled: autoStartHandledRef.current,
      })
    ) {
      return;
    }
    autoStartHandledRef.current = true;
    router.setParams({ autoStart: undefined, petId: undefined });
    void beginWalkFromSelect();
  }, [searchParams, phase, walkPetIds, beginWalkFromSelect, router]);

  const onAlwaysExplainerRequestBackground = useCallback(async () => {
    setAlwaysExplainerOpen(false);
    await markPawthonAlwaysExplainerSeen();
    let Location: typeof import("expo-location");
    try {
      Location = await loadExpoLocation();
    } catch {
      return;
    }
    const bg = await requestWalkBackgroundLocation(Location);
    trackingModeRef.current = bg.granted ? "background" : "foreground";
    await startWarmup(Location);
  }, [startWarmup]);

  const onAlwaysExplainerForegroundOnly = useCallback(async () => {
    setAlwaysExplainerOpen(false);
    await markPawthonAlwaysExplainerSeen();
    trackingModeRef.current = "foreground";
    let Location: typeof import("expo-location");
    try {
      Location = await loadExpoLocation();
    } catch {
      return;
    }
    Alert.alert(
      "While using the app",
      "If you lock the screen or switch apps, the route may pause until you return. For pocket walks, choose “Allow always” in Settings → PawBuck → Location."
    );
    await startWarmup(Location);
  }, [startWarmup]);

  const endWalk = useCallback(async () => {
    if (!isWalkingRef.current) return;

    const petIds = [...walkPetIds];
    const startedAt = startedAtRef.current;
    const endedAt = new Date();

    const sim = isSimulatedWalkRef.current;
    const snap = sim ? null : getPawthonWalkSnapshot();
    const meters = sim ? distanceMRef.current : snap!.distanceM;
    const points = sim ? [...pointsRef.current] : [...snap!.points];
    const pathSnapshot = sim ? [...pathCoordsRef.current] : [...snap!.pathCoords];

    await stopTracking();
    setIsWalking(false);
    setIsSimulatedWalk(false);

    startedAtRef.current = null;
    lastPosRef.current = null;
    pointsRef.current = [];

    if (petIds.length === 0 || !startedAt || walkPets.length === 0) {
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

      const result = await insertWalkSessionsForPets({
        userId: userData.user.id,
        petIds,
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

      const primaryPetId = petIds[0]!;
      for (const petId of petIds) {
        await queryClient.invalidateQueries({ queryKey: ["pawthon", petId] });
        await queryClient.invalidateQueries({ queryKey: ["pawthon", "hub", petId] });
        await queryClient.invalidateQueries({ queryKey: ["pawthon", "home", petId] });
        await queryClient.invalidateQueries({ queryKey: ["pawthon", "history", petId] });
      }
      await queryClient.invalidateQueries({ queryKey: ["pawthon", "weeklyWalkerRank"] });
      const stats = await queryClient.fetchQuery({
        queryKey: ["pawthon", primaryPetId],
        queryFn: () => fetchPawthonDashboardStats(primaryPetId),
      });

      const goalMeters = await getDailyGoalMeters();
      const primaryPet = walkPets[0]!;
      const rank = await fetchMyWeeklyWalkerRankForCountry(primaryPet.country?.trim() ?? "");
      const badgeSets = await Promise.all(
        petIds.map((petId) =>
          processBadgesAfterWalk({
            userId: userData.user.id,
            petId,
            hasVerificationPhoto: !!verificationUri,
            weeklyRank: rank.rank,
            goalMeters,
            pets: pets.map((p) => ({ id: p.id })),
          })
        )
      );
      const newBadges = [...new Set(badgeSets.flat())];
      await queryClient.invalidateQueries({ queryKey: ["pawthon", "badges", userData.user.id] });

      const dur = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
      setComplete({
        pets: walkPets,
        distanceMeters: meters,
        durationSec: dur,
        path: pathSnapshot.length >= 2 ? pathSnapshot : pathSnapshot.length === 1 ? [...pathSnapshot, ...pathSnapshot] : [],
        verificationUri,
        streak: stats.streak,
        newBadges,
        sessionId: result.ids[0] ?? null,
        endedAt: endedAt.toISOString(),
        weeklyRankLine: formatWeeklyWalkerRankLine(rank.rank, rank.total),
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
  }, [stopTracking, walkPetIds, walkPets, verificationUri, queryClient, pets]);

  /**
   * Simulator / dev: play ~1 km of fake GPS without moving, then auto-save (same as Stop).
   * Only available when __DEV__ is true.
   */
  const beginSimulatedWalkDev = useCallback(() => {
    if (!__DEV__) return;
    if (simPlaybackRef.current) return;
    if (walkPetIds.length === 0) {
      Alert.alert("Select a pet", "Choose at least one pet for this walk.");
      return;
    }

    setIsSimulatedWalk(true);
    setSelectedPetId(walkPetIds[0]!);
    setVerificationUri(null);
    void stopTracking();
    setPathCoords([]);
    pathCoordsRef.current = [];
    setDistanceM(0);
    setDurationSec(0);
    distanceMRef.current = 0;
    pointsRef.current = [];
    lastPosRef.current = null;
    const start = previewCoord ?? PAWTHON_SIM_DEFAULT_START;
    const segmentCount = 25;
    const path = buildSimulatedWalkPath(start, 1000, segmentCount, 72);
    if (__DEV__) {
      console.log(
        "[Pawthon sim] ~target 1000 m, haversine path length:",
        Math.round(pathLengthMeters(path)),
        "m"
      );
    }

    startedAtRef.current = new Date();
    setIsWalking(true);
    setPhase("active");

    tickRef.current = setInterval(() => {
      if (startedAtRef.current) {
        setDurationSec(Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000));
      }
    }, 1000);

    let i = 0;
    simPlaybackRef.current = setInterval(() => {
      if (i >= path.length) {
        if (simPlaybackRef.current) {
          clearInterval(simPlaybackRef.current);
          simPlaybackRef.current = null;
        }
        setTimeout(() => {
          void endWalk();
        }, 400);
        return;
      }
      onLocation(path[i]!);
      i += 1;
    }, 90);
  }, [walkPetIds, setSelectedPetId, stopTracking, previewCoord, onLocation, endWalk]);

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
  const paceMin = paceMinPerMile(durationSec, milesNow);
  const paceStr = formatPace(paceMin);
  const paceHasData = paceMin > 0 && Number.isFinite(paceMin);

  const mapPreview =
    previewCoord ? (
      <PawthonWalkMap path={[previewCoord]} style={{ flex: 1 }} showUserLocation />
    ) : null;

  const headerBack = (options?: { confirmIfWalking?: boolean }) => (
    <Pressable
      onPress={() => {
        if (phase === "warmup") {
          void stopTracking();
          setIsWalking(false);
          startedAtRef.current = null;
          setPhase("select");
          return;
        }
        if (options?.confirmIfWalking && isWalking) {
          Alert.alert("End walk?", "Discard this walk or tap Stop to save.", [
            { text: "Keep walking", style: "cancel" },
            {
              text: "Discard",
              style: "destructive",
              onPress: () => {
                void stopTracking();
                setIsSimulatedWalk(false);
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
          void stopTracking();
          setIsSimulatedWalk(false);
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
    const pace = paceMinPerMile(complete.durationSec, mi);
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <PawthonWalkSharePreviewModal
          visible={sharePreviewOpen}
          payload={sharePreviewPayload}
          onClose={() => {
            setSharePreviewOpen(false);
            setSharePreviewPayload(null);
          }}
        />
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
            ref={completeMapCaptureRef}
            collapsable={false}
            style={{
              height: 240,
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
                label: "Pace",
                value: formatPace(pace),
                unit: "/mi",
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
            {formatWalkPetNames(complete.pets)}
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

          {complete.newBadges.length > 0 ? (
            <PawthonBadgeUnlockCard badgeId={complete.newBadges[0]} />
          ) : (
            <View
              style={{
                backgroundColor: PAWTHON_PEACH_CARD,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Ionicons name="flame" size={22} color="#E65100" />
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 15, color: "#5D4037", marginTop: 8 }}>
                {complete.streak >= 2 ? `${complete.streak}-day streak` : "Keep the streak!"}
              </Text>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: "#6D4C41", marginTop: 4 }}>
                {complete.streak >= 2
                  ? "You’re on a roll"
                  : "Walk again tomorrow to start a streak"}
              </Text>
            </View>
          )}

          {complete.sessionId ? (
            <Pressable
              onPress={() => {
                setComplete(null);
                router.push(`/(home)/pawthon/walk/${complete.sessionId}` as any);
              }}
              style={{ marginBottom: 12 }}
            >
              <LinearGradient
                colors={[PAWTHON_TEAL, "#1FA8A8"]}
                style={{ paddingVertical: 16, borderRadius: 16, alignItems: "center" }}
              >
                <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 17, color: "#FFFFFF" }}>
                  View in walk log
                </Text>
              </LinearGradient>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => router.push("/(home)/pawthon/badges" as any)}
            style={{ marginBottom: 12, alignItems: "center" }}
          >
            <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 14, color: PAWTHON_TEAL }}>
              View all badges
            </Text>
          </Pressable>

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
              void (async () => {
                const mapSnapshotUri = await captureWalkMapSnapshot(completeMapCaptureRef);
                setSharePreviewPayload(
                  buildWalkSharePayloadFromComplete({
                    ...complete,
                    mapSnapshotUri,
                  })
                );
                setSharePreviewOpen(true);
              })();
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
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: theme.foreground }}>
                Share story
              </Text>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 11, color: theme.secondary, marginTop: 2 }}>
                Instagram & WhatsApp
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  /* ——— GPS warmup / countdown ——— */
  if (phase === "warmup" || phase === "countdown") {
    const countdownDisplay = countdownGo
      ? "Go!"
      : String(PAWTHON_COUNTDOWN_SECONDS[countdownIndex] ?? "");
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <StatusBar style="light" />
        <PawthonWalkMap
          path={previewCoord ? [previewCoord] : []}
          style={{ flex: 1 }}
          showUserLocation
        />
        {phase === "countdown" ? (
          <PawthonCountdownOverlay
            petName={walkPetLabel || "your pet"}
            display={countdownDisplay}
            phase={countdownGo ? "go" : "number"}
            onSkip={() => void skipCountdownAndStart()}
          />
        ) : null}
        <View
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            zIndex: 10,
          }}
        >
          {headerBack()}
        </View>
        {phase === "warmup" ? (
        <View
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            bottom: Math.max(insets.bottom, 24) + 24,
            padding: 20,
            borderRadius: 20,
            backgroundColor: "rgba(0,0,0,0.72)",
          }}
        >
          <Text
            style={{
              fontFamily: "Poppins_700Bold",
              fontSize: 20,
              color: "#FFF",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Acquiring GPS…
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_500Medium",
              fontSize: 14,
              color: "rgba(255,255,255,0.88)",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            Hold still for a moment. Recording starts after accuracy is good or after{" "}
            {Math.ceil(PAWTHON_WARMUP_TIMEOUT_MS / 1000)}s.
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 15,
              color: PAWTHON_TEAL,
              textAlign: "center",
            }}
          >
            {warmupAccuracy != null && Number.isFinite(warmupAccuracy)
              ? `±${Math.round(warmupAccuracy)} m · ${warmupElapsedSec}s`
              : `${warmupElapsedSec}s`}
          </Text>
        </View>
        ) : null}
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 4 }}>
            {walkPets[0]?.photo_url ? (
              <View style={{ width: 36, height: 36, borderRadius: 18, overflow: "hidden" }}>
                <PrivateImage
                  bucketName="pets"
                  filePath={walkPets[0].photo_url}
                  style={{ width: 36, height: 36 }}
                  resizeMode="cover"
                />
              </View>
            ) : null}
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 14,
                color: PAWTHON_TEAL,
                textAlign: "center",
              }}
            >
              Tracking {walkPetLabel || "your walk"}
            </Text>
          </View>
          {warmupWeakGps ? (
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                fontSize: 12,
                color: theme.secondary,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              GPS was weak at start — the first part of the route may be less accurate.
            </Text>
          ) : null}
          {sessionSteps > 0 && !isSimulatedWalk ? (
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                fontSize: 12,
                color: theme.secondary,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Steps (foreground, approximate): {sessionSteps}
            </Text>
          ) : null}

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
                avg pace{paceHasData ? " (min/mi)" : ""}
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
          Start a Walk
        </Text>
      </View>
      <Modal
        visible={alwaysExplainerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setAlwaysExplainerOpen(false);
          void (async () => {
            await markPawthonAlwaysExplainerSeen();
            try {
              const Location = await loadExpoLocation();
              await startWarmup(Location);
            } catch {
              /* handled in beginWalk */
            }
          })();
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            paddingHorizontal: 22,
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 20,
              padding: 22,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_700Bold",
                fontSize: 18,
                color: theme.foreground,
                marginBottom: 10,
              }}
            >
              Pocket and screen-off walks
            </Text>
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                fontSize: 14,
                color: theme.secondary,
                marginBottom: 18,
                lineHeight: 21,
              }}
            >
              For a reliable route while your phone is locked or in your pocket, allow{" "}
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: theme.foreground }}>
                Always
              </Text>{" "}
              (iOS) or{" "}
              <Text style={{ fontFamily: "Poppins_600SemiBold", color: theme.foreground }}>
                background location
              </Text>{" "}
              (Android). Tracking runs only during an active walk. You may see a status indicator or
              notification while a walk is recording.
            </Text>
            <Pressable
              onPress={() => void onAlwaysExplainerRequestBackground()}
              style={{
                backgroundColor: PAWTHON_TEAL,
                borderRadius: 14,
                paddingVertical: 14,
                marginBottom: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 16, color: "#FFF" }}>
                Allow always / background
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void onAlwaysExplainerForegroundOnly()}
              style={{
                borderRadius: 14,
                paddingVertical: 14,
                marginBottom: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 15, color: theme.foreground }}>
                Continue with “While Using” only
              </Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openSettings()}
              style={{ paddingVertical: 10, alignItems: "center" }}
            >
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 14, color: theme.primary }}>
                Open system settings
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <PawthonPetSelect
          pets={pets}
          selectedPetIds={walkPetIds}
          onTogglePetId={(id) => setWalkPetIds((prev) => toggleWalkPetId(prev, id))}
          onSelectAll={() => setWalkPetIds(pets.map((p) => p.id))}
          onStartWalk={beginWalkFromSelect}
          mapPreview={mapPreview ?? undefined}
        />
        {__DEV__ && (
          <Pressable
            onPress={beginSimulatedWalkDev}
            style={{
              marginTop: 12,
              marginBottom: 8,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 14,
                color: theme.secondary,
                textAlign: "center",
              }}
            >
              Dev: Simulate 1 km walk (~3s, auto-saves)
            </Text>
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                fontSize: 12,
                color: theme.secondary,
                textAlign: "center",
                marginTop: 4,
                opacity: 0.85,
              }}
            >
              For iOS Simulator — no real GPS required
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
