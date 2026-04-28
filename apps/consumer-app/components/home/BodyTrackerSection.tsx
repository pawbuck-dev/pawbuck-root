import {
  PEE_OUTPUT_TAGS,
  POOP_OUTPUT_TAGS,
  peeNeedsObservationDetail,
  poopNeedsObservationDetail,
} from "@/constants/bodyTracker";
import BodyTrackerObservationBlock from "@/components/home/BodyTrackerObservationBlock";
import { RiceBowlIcon, WaterGlassIcon } from "@/components/icons";
import DailyIntakeConfigModal from "@/components/home/DailyIntakeConfigModal";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { syncBodyTrackerObservationJournals } from "@/services/bodyTrackerJournalSync";
import { DailyIntake, getDailyIntake, updateDailyIntake } from "@/services/dailyIntake";
import { insertWeightLog, listWeightLogs, updatePetTargetWeight } from "@/services/petWeightLogs";
import type { WeightUnit } from "@/utils/weightUnits";
import { clearUrlCache, deleteFile, uploadFile } from "@/utils/image";
import { pickImageFromLibrary, takePhoto } from "@/utils/imagePicker";
import { convertWeight, formatWeight } from "@/utils/weightUnits";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ImagePickerAsset } from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Polyline } from "react-native-svg";

type BodyTrackerSectionProps = {
  petId: string;
};

type BodyTrackerSegment = "intake" | "output" | "weight";

const EMPTY_TAG_LIST: string[] = [];

const SEGMENTS: { id: BodyTrackerSegment; label: string; emoji: string }[] = [
  { id: "intake", label: "Intake", emoji: "🍖" },
  { id: "output", label: "Output", emoji: "💩" },
  { id: "weight", label: "Weight", emoji: "⚖️" },
];

/**
 * Layout size per intake slot (icons stay 28px inside). hitSlop expands the touch target toward ~44pt
 * without forcing tall rows that stretch the shorter Food card when Water has more rows.
 */
const INTAKE_SLOT_LAYOUT = 36;

const ProgressIcons = ({
  count,
  total,
  filledColor,
  emptyColor,
  type,
  onSelectSlot,
}: {
  count: number;
  total: number;
  filledColor: string;
  emptyColor: string;
  type: "food" | "water";
  onSelectSlot: (slotIndex: number) => void;
}) => (
  <View
    style={{
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
      marginVertical: 6,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    {Array.from({ length: total }).map((_, i) => {
      const filled = i < count;
      const label =
        type === "food"
          ? `Meal ${i + 1} of ${total}, ${filled ? "logged" : "not logged"}. Tap to set meals to ${i + 1}.`
          : `Cup ${i + 1} of ${total}, ${filled ? "logged" : "not logged"}. Tap to set cups to ${i + 1}.`;
      return (
        <Pressable
          key={i}
          onPress={() => onSelectSlot(i)}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={{
            width: INTAKE_SLOT_LAYOUT,
            height: INTAKE_SLOT_LAYOUT,
            alignItems: "center",
            justifyContent: "center",
          }}
          {...(Platform.OS === "android"
            ? { android_ripple: { color: "rgba(0,0,0,0.08)", borderless: true } }
            : {})}
        >
          {type === "food" ? (
            <RiceBowlIcon size={28} color={filled ? filledColor : emptyColor} pointerEvents="none" />
          ) : (
            <WaterGlassIcon size={28} filled={filled} color="#93C5FD" pointerEvents="none" />
          )}
        </Pressable>
      );
    })}
  </View>
);

function OutputDropIcons({
  count,
  total,
  iconType,
  onSelectSlot,
}: {
  count: number;
  total: number;
  iconType: "poop" | "pee";
  onSelectSlot: (slotIndex: number) => void;
}) {
  const emoji = iconType === "poop" ? "💩" : "💧";
  const unit = iconType === "poop" ? "bowel movement" : "urination";
  return (
    <>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < count;
        return (
          <Pressable
            key={i}
            onPress={() => onSelectSlot(i)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${unit} ${i + 1} of ${total}, ${filled ? "logged" : "not logged"}. Tap to set count to ${i + 1}.`}
            style={{ marginHorizontal: 2 }}
          >
            <Text style={{ fontSize: iconType === "poop" ? 20 : 22, opacity: filled ? 1 : 0.22 }}>{emoji}</Text>
          </Pressable>
        );
      })}
    </>
  );
}

export default function BodyTrackerSection({ petId }: BodyTrackerSectionProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { width: winW } = useWindowDimensions();
  const { user } = useAuth();
  const { pets } = usePets();
  const pet = pets.find((p) => p.id === petId) ?? null;
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [displayUnit, setDisplayUnit] = useState<WeightUnit>(
    pet?.weight_unit === "kg" ? "kg" : "lbs"
  );
  const [activeSegment, setActiveSegment] = useState<BodyTrackerSegment>("intake");
  const [trendsOpen, setTrendsOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logValue, setLogValue] = useState("");
  const [targetDraft, setTargetDraft] = useState("");
  const queryClient = useQueryClient();
  const intakeQueryKey = ["daily_intake", petId];
  const logsQueryKey = ["pet_weight_logs", petId];

  const { data: intake, isLoading } = useQuery({
    queryKey: intakeQueryKey,
    queryFn: () => getDailyIntake(petId),
    enabled: !!petId,
  });

  const { data: weightLogs = [] } = useQuery({
    queryKey: logsQueryKey,
    queryFn: () => listWeightLogs(petId, 40),
    enabled: !!petId,
  });

  const mutation = useMutation({
    mutationFn: (
      updates: Partial<
        Pick<
          DailyIntake,
          | "food_intake"
          | "water_intake"
          | "food_target"
          | "water_target"
          | "poop_count"
          | "pee_count"
          | "poop_tags"
          | "pee_tags"
          | "poop_observation_note"
          | "poop_observation_photo_path"
          | "pee_observation_note"
          | "pee_observation_photo_path"
          | "poop_journal_entry_id"
          | "pee_journal_entry_id"
        >
      >
    ) => updateDailyIntake(petId, updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: intakeQueryKey });
      const previous = queryClient.getQueryData<DailyIntake>(intakeQueryKey);
      if (previous) {
        queryClient.setQueryData<DailyIntake>(intakeQueryKey, { ...previous, ...updates });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(intakeQueryKey, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: intakeQueryKey }),
  });

  const weightMutation = useMutation({
    mutationFn: async ({
      w,
      u,
      target,
    }: {
      w: number;
      u: WeightUnit;
      target: number | null;
    }) => {
      await insertWeightLog(petId, w, u);
      if (target != null && target > 0) {
        await updatePetTargetWeight(petId, target, u);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["pets", user?.id] });
      setLogOpen(false);
      setLogValue("");
      setTargetDraft("");
    },
  });

  const foodIntake = intake?.food_intake ?? 0;
  const waterIntake = intake?.water_intake ?? 0;
  const foodTarget = intake?.food_target ?? 4;
  const waterTarget = intake?.water_target ?? 6;
  const poopCount = intake?.poop_count ?? 0;
  const peeCount = intake?.pee_count ?? 0;
  const poopTarget = intake?.poop_target ?? 6;
  const peeTarget = intake?.pee_target ?? 6;
  const poopTags = intake?.poop_tags ?? EMPTY_TAG_LIST;
  const peeTags = intake?.pee_tags ?? EMPTY_TAG_LIST;

  const showPoopObservation = poopNeedsObservationDetail(poopTags);
  const showPeeObservation = peeNeedsObservationDetail(peeTags);

  const [poopNoteDraft, setPoopNoteDraft] = useState("");
  const [peeNoteDraft, setPeeNoteDraft] = useState("");
  const [uploadingPoopPhoto, setUploadingPoopPhoto] = useState(false);
  const [uploadingPeePhoto, setUploadingPeePhoto] = useState(false);

  useEffect(() => {
    setPoopNoteDraft(intake?.poop_observation_note ?? "");
  }, [intake?.poop_observation_note]);

  useEffect(() => {
    setPeeNoteDraft(intake?.pee_observation_note ?? "");
  }, [intake?.pee_observation_note]);

  useEffect(() => {
    if (!intake?.id || !user) return;
    const timer = setTimeout(() => {
      const row = queryClient.getQueryData<DailyIntake>(intakeQueryKey);
      if (!row) return;
      void (async () => {
        try {
          await syncBodyTrackerObservationJournals(
            petId,
            row,
            poopNoteDraft,
            peeNoteDraft,
            queryClient,
            intakeQueryKey
          );
          await queryClient.invalidateQueries({ queryKey: ["pet_journal", petId] });
          await queryClient.invalidateQueries({ queryKey: ["health_briefing", petId] });
        } catch (e) {
          console.warn("Body tracker journal sync failed", e);
        }
      })();
    }, 750);
    return () => clearTimeout(timer);
  }, [
    petId,
    user?.id,
    intake?.id,
    poopTags,
    peeTags,
    poopNoteDraft,
    peeNoteDraft,
    intake?.poop_observation_photo_path,
    intake?.pee_observation_photo_path,
    intake?.poop_observation_note,
    intake?.pee_observation_note,
    intake?.date,
    queryClient,
    intakeQueryKey,
  ]);

  const savePoopObservationNote = useCallback(() => {
    const next = poopNoteDraft.trim() || null;
    const prev = intake?.poop_observation_note?.trim() || null;
    if (next === prev) return;
    mutation.mutate({ poop_observation_note: next });
  }, [poopNoteDraft, intake?.poop_observation_note, mutation]);

  const savePeeObservationNote = useCallback(() => {
    const next = peeNoteDraft.trim() || null;
    const prev = intake?.pee_observation_note?.trim() || null;
    if (next === prev) return;
    mutation.mutate({ pee_observation_note: next });
  }, [peeNoteDraft, intake?.pee_observation_note, mutation]);

  const petSlug = pet?.name?.split(/\s+/).join("_") ?? "pet";

  const uploadPoopObservationPhoto = useCallback(
    async (asset: ImagePickerAsset) => {
      if (!user) return;
      setUploadingPoopPhoto(true);
      try {
        const ext = asset.uri.split(".").pop() || "jpg";
        const path = `${user.id}/pet_${petSlug}_${petId}/body-tracker/poop-${Date.now()}.${ext}`;
        const data = await uploadFile(asset, path);
        clearUrlCache(data.path);
        const previous = intake?.poop_observation_photo_path;
        if (previous && previous !== data.path) {
          try {
            await deleteFile(previous);
          } catch {
            /* ignore storage cleanup errors */
          }
        }
        mutation.mutate({ poop_observation_photo_path: data.path });
      } catch {
        Alert.alert("Error", "Could not upload photo. Please try again.");
      } finally {
        setUploadingPoopPhoto(false);
      }
    },
    [user, petSlug, petId, intake?.poop_observation_photo_path, mutation]
  );

  const uploadPeeObservationPhoto = useCallback(
    async (asset: ImagePickerAsset) => {
      if (!user) return;
      setUploadingPeePhoto(true);
      try {
        const ext = asset.uri.split(".").pop() || "jpg";
        const path = `${user.id}/pet_${petSlug}_${petId}/body-tracker/pee-${Date.now()}.${ext}`;
        const data = await uploadFile(asset, path);
        clearUrlCache(data.path);
        const previous = intake?.pee_observation_photo_path;
        if (previous && previous !== data.path) {
          try {
            await deleteFile(previous);
          } catch {
            /* ignore */
          }
        }
        mutation.mutate({ pee_observation_photo_path: data.path });
      } catch {
        Alert.alert("Error", "Could not upload photo. Please try again.");
      } finally {
        setUploadingPeePhoto(false);
      }
    },
    [user, petSlug, petId, intake?.pee_observation_photo_path, mutation]
  );

  const promptPoopPhoto = useCallback(() => {
    Alert.alert("Add photo", "Choose a source", [
      {
        text: "Take photo",
        onPress: async () => {
          const image = await takePhoto();
          if (image) await uploadPoopObservationPhoto(image);
        },
      },
      {
        text: "Photo library",
        onPress: async () => {
          const image = await pickImageFromLibrary();
          if (image) await uploadPoopObservationPhoto(image);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [uploadPoopObservationPhoto]);

  const promptPeePhoto = useCallback(() => {
    Alert.alert("Add photo", "Choose a source", [
      {
        text: "Take photo",
        onPress: async () => {
          const image = await takePhoto();
          if (image) await uploadPeeObservationPhoto(image);
        },
      },
      {
        text: "Photo library",
        onPress: async () => {
          const image = await pickImageFromLibrary();
          if (image) await uploadPeeObservationPhoto(image);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [uploadPeeObservationPhoto]);

  const removePoopObservationPhoto = useCallback(async () => {
    const p = intake?.poop_observation_photo_path;
    if (p) {
      try {
        await deleteFile(p);
      } catch {
        /* ignore */
      }
      clearUrlCache(p);
    }
    mutation.mutate({ poop_observation_photo_path: null });
  }, [intake?.poop_observation_photo_path, mutation]);

  const removePeeObservationPhoto = useCallback(async () => {
    const p = intake?.pee_observation_photo_path;
    if (p) {
      try {
        await deleteFile(p);
      } catch {
        /* ignore */
      }
      clearUrlCache(p);
    }
    mutation.mutate({ pee_observation_photo_path: null });
  }, [intake?.pee_observation_photo_path, mutation]);

  const toggleTag = (kind: "poop" | "pee", tag: string) => {
    const arr = kind === "poop" ? [...poopTags] : [...peeTags];
    const i = arr.indexOf(tag);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(tag);
    mutation.mutate(kind === "poop" ? { poop_tags: arr } : { pee_tags: arr });
  };

  const chartW = Math.min(winW - 56, 320);
  const chartH = 56;

  const sparklinePoints = useMemo(() => {
    const asc = [...weightLogs].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    const slice = asc.slice(-8);
    if (slice.length < 2) return "";
    const vals = slice.map((l) =>
      convertWeight(l.weight_value, l.weight_unit as WeightUnit, displayUnit)
    );
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    return vals
      .map((v, i) => {
        const x = (i / (vals.length - 1)) * chartW;
        const y = chartH - ((v - min) / range) * (chartH - 8) - 4;
        return `${x},${y}`;
      })
      .join(" ");
  }, [weightLogs, displayUnit, chartW]);

  const latestLog = weightLogs.length ? weightLogs[0] : null;
  const displayWeight = useMemo(() => {
    if (latestLog) {
      return convertWeight(latestLog.weight_value, latestLog.weight_unit as WeightUnit, displayUnit);
    }
    if (pet) {
      const u = pet.weight_unit === "kg" ? "kg" : "lbs";
      return convertWeight(pet.weight_value, u, displayUnit);
    }
    return null;
  }, [latestLog, pet, displayUnit]);

  const targetValue = pet?.target_weight_value ?? null;
  const targetUnit = (pet?.target_weight_unit as WeightUnit | null) ?? null;
  const displayTarget =
    targetValue != null && targetUnit
      ? convertWeight(targetValue, targetUnit, displayUnit)
      : null;

  const deltaVsTarget =
    displayWeight != null && displayTarget != null ? displayWeight - displayTarget : null;

  const daysSince = useMemo(() => {
    if (!latestLog?.recorded_at) return null;
    const diff = Date.now() - new Date(latestLog.recorded_at).getTime();
    return Math.floor(diff / (86400000));
  }, [latestLog]);

  const handleSubmitLog = () => {
    const w = parseFloat(logValue.replace(",", "."));
    if (Number.isNaN(w) || w <= 0) return;
    const t = targetDraft.trim() ? parseFloat(targetDraft.replace(",", ".")) : null;
    weightMutation.mutate({
      w,
      u: displayUnit,
      target: t != null && !Number.isNaN(t) && t > 0 ? t : null,
    });
  };

  const handleUpdateTargets = useCallback(
    (newWaterTarget: number, newFoodTarget: number) => {
      mutation.mutate({ food_target: newFoodTarget, water_target: newWaterTarget });
    },
    [mutation]
  );

  if (isLoading) {
    return (
      <View style={{ paddingHorizontal: 20 }}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF";
  const isAndroid = Platform.OS === "android";
  const cardBorderStyle = isAndroid
    ? {}
    : { borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" };
  const btnBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
  const chipOutline = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)";
  const primaryTeal = isDark ? "#3BD0D2" : "#2BA89E";
  const segmentTrackBg = isDark ? "rgba(255,255,255,0.1)" : "#E4E8EA";
  const segmentInactiveColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";
  const segmentActivePillBg = isDark ? theme.card : "#FFFFFF";
  const segmentPillShadow = Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
    default: {},
  });

  const obsCardBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  const pill = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: selected ? primaryTeal : chipOutline,
        backgroundColor: selected ? (isDark ? "rgba(59,208,210,0.15)" : "rgba(43,168,158,0.12)") : "transparent",
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 13, color: theme.foreground }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "500",
            color: isDark ? "#FFFFFF" : "#0D0F0F",
            lineHeight: 21.6,
            textTransform: "capitalize",
          }}
        >
          Body Tracker
        </Text>
        <TouchableOpacity
          onPress={() => setTrendsOpen(true)}
          activeOpacity={0.75}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: btnBg,
          }}
        >
          <Ionicons name="bar-chart-outline" size={18} color={theme.secondary} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: theme.secondary }}>Trends</Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          flexDirection: "row",
          borderRadius: 22,
          padding: 4,
          marginBottom: 16,
          backgroundColor: segmentTrackBg,
        }}
      >
        {SEGMENTS.map(({ id, label, emoji }) => {
          const selected = activeSegment === id;
          return (
            <Pressable
              key={id}
              onPress={() => setActiveSegment(id)}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, paddingHorizontal: 4 }}
            >
              <View
                style={[
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    paddingVertical: 8,
                    paddingHorizontal: 8,
                    borderRadius: 18,
                    width: "100%",
                  },
                  selected
                    ? {
                        backgroundColor: segmentActivePillBg,
                        ...segmentPillShadow,
                      }
                    : {},
                ]}
              >
                <Text style={{ fontSize: 15 }}>{emoji}</Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 13,
                    fontWeight: selected ? "700" : "500",
                    color: selected ? theme.foreground : segmentInactiveColor,
                  }}
                >
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {activeSegment === "intake" && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }}>Daily Intake</Text>
            <TouchableOpacity onPress={() => setShowConfigModal(true)}>
              <Ionicons name="settings-outline" size={20} color={theme.secondary} />
            </TouchableOpacity>
          </View>
          {/* Equal-height cards: row stretch + inner column space-between so extra height isn’t a dead gap */}
          <View style={{ flexDirection: "row", alignItems: "stretch", gap: 12, marginBottom: 24 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: cardBg,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingTop: 16,
            paddingBottom: 14,
            ...cardBorderStyle,
          }}
        >
          <View style={{ flex: 1, minHeight: 0, justifyContent: "space-between" }}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <RiceBowlIcon size={22} color={isDark ? theme.foreground : "#1D2433"} />
                <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Food</Text>
              </View>
              <Text
                numberOfLines={2}
                style={{
                  fontSize: 12,
                  lineHeight: 16,
                  color: theme.secondary,
                  marginTop: 2,
                  marginLeft: 30,
                  minHeight: 32,
                }}
              >
                {foodIntake * 150}g/{foodTarget * 150}g daily
              </Text>
            </View>
            <ProgressIcons
              count={foodIntake}
              total={foodTarget}
              filledColor={primaryTeal}
              emptyColor={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}
              type="food"
              onSelectSlot={(i) => mutation.mutate({ food_intake: Math.min(i + 1, foodTarget) })}
            />
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: theme.foreground,
                textAlign: "center",
              }}
            >
              {foodIntake}/{foodTarget} meals
            </Text>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: cardBg,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingTop: 16,
            paddingBottom: 14,
            ...cardBorderStyle,
          }}
        >
          <View style={{ flex: 1, minHeight: 0, justifyContent: "space-between" }}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="water-outline" size={22} color={isDark ? "#FFFFFF" : "#1D2433"} />
                <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Water</Text>
              </View>
              <Text
                numberOfLines={2}
                style={{
                  fontSize: 12,
                  lineHeight: 16,
                  color: theme.secondary,
                  marginTop: 2,
                  marginLeft: 30,
                  minHeight: 32,
                }}
              >
                {waterIntake * 250}ml/{waterTarget * 250}ml daily
              </Text>
            </View>
            <ProgressIcons
              count={waterIntake}
              total={waterTarget}
              filledColor={isDark ? "#60A5FA" : "#3B82F6"}
              emptyColor={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}
              type="water"
              onSelectSlot={(i) => mutation.mutate({ water_intake: Math.min(i + 1, waterTarget) })}
            />
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: theme.foreground,
                textAlign: "center",
              }}
            >
              {waterIntake}/{waterTarget} cups
            </Text>
          </View>
        </View>
      </View>
        </>
      )}

      {activeSegment === "output" && (
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
          ...cardBorderStyle,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>💩 Poop</Text>
          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.secondary }}>
            {poopCount}/{poopTarget}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 10,
            gap: 4,
          }}
        >
          <OutputDropIcons
            count={poopCount}
            total={poopTarget}
            iconType="poop"
            onSelectSlot={(i) => mutation.mutate({ poop_count: Math.min(i + 1, poopTarget) })}
          />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
          {POOP_OUTPUT_TAGS.map((t) => pill(t, poopTags.includes(t), () => toggleTag("poop", t)))}
        </View>

        {showPoopObservation ? (
          <BodyTrackerObservationBlock
            title="Stool observation"
            note={poopNoteDraft}
            onChangeNote={setPoopNoteDraft}
            onBlurSave={savePoopObservationNote}
            photoPath={intake?.poop_observation_photo_path ?? null}
            onAddPhoto={promptPoopPhoto}
            onRemovePhoto={() => {
              void removePoopObservationPhoto();
            }}
            uploadingPhoto={uploadingPoopPhoto}
            isDark={isDark}
            cardSubtleBg={obsCardBg}
            borderStyle={cardBorderStyle}
            secondaryText={theme.secondary}
            foreground={theme.foreground}
            btnBg={btnBg}
          />
        ) : null}

        <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", marginVertical: 16 }} />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>💧 Pee</Text>
          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.secondary }}>
            {peeCount}/{peeTarget}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 10,
            gap: 4,
          }}
        >
          <OutputDropIcons
            count={peeCount}
            total={peeTarget}
            iconType="pee"
            onSelectSlot={(i) => mutation.mutate({ pee_count: Math.min(i + 1, peeTarget) })}
          />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
          {PEE_OUTPUT_TAGS.map((t) => pill(t, peeTags.includes(t), () => toggleTag("pee", t)))}
        </View>

        {showPeeObservation ? (
          <BodyTrackerObservationBlock
            title="Urine observation"
            note={peeNoteDraft}
            onChangeNote={setPeeNoteDraft}
            onBlurSave={savePeeObservationNote}
            photoPath={intake?.pee_observation_photo_path ?? null}
            onAddPhoto={promptPeePhoto}
            onRemovePhoto={() => {
              void removePeeObservationPhoto();
            }}
            uploadingPhoto={uploadingPeePhoto}
            isDark={isDark}
            cardSubtleBg={obsCardBg}
            borderStyle={cardBorderStyle}
            secondaryText={theme.secondary}
            foreground={theme.foreground}
            btnBg={btnBg}
          />
        ) : null}
      </View>
      )}

      {activeSegment === "weight" && (
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 20,
          padding: 16,
          marginBottom: 8,
          ...cardBorderStyle,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flexDirection: "row", backgroundColor: btnBg, borderRadius: 20, padding: 3 }}>
            {(["lbs", "kg"] as const).map((u) => (
              <TouchableOpacity
                key={u}
                onPress={() => setDisplayUnit(u)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: displayUnit === u ? (isDark ? theme.card : "#FFFFFF") : "transparent",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground }}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => setLogOpen(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: primaryTeal,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 20,
              gap: 6,
            }}
          >
            <Ionicons name="scale-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Log</Text>
          </TouchableOpacity>
        </View>

        {displayWeight != null && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 36, fontWeight: "800", color: theme.foreground }}>
              {formatWeight(displayWeight, displayUnit)}{" "}
              <Text style={{ fontSize: 18, fontWeight: "500", color: theme.secondary }}>{displayUnit}</Text>
            </Text>
            {deltaVsTarget != null && displayTarget != null && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 }}>
                <Ionicons
                  name={deltaVsTarget > 0 ? "trending-up" : "trending-down"}
                  size={18}
                  color="#EA580C"
                />
                <Text style={{ color: "#EA580C", fontSize: 14, fontWeight: "600" }}>
                  {deltaVsTarget > 0 ? "+" : ""}
                  {formatWeight(Math.abs(deltaVsTarget), displayUnit)} {deltaVsTarget > 0 ? "over" : "under"} target (
                  {formatWeight(displayTarget, displayUnit)} {displayUnit})
                </Text>
              </View>
            )}
          </View>
        )}

        {sparklinePoints ? (
          <View style={{ marginTop: 12 }}>
            <Svg width={chartW} height={chartH}>
              <Polyline points={sparklinePoints} fill="none" stroke={primaryTeal} strokeWidth={2} />
            </Svg>
          </View>
        ) : (
          <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 12 }}>
            Log at least two weigh-ins to see a trend.
          </Text>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 6 }}>
          <Ionicons name="time-outline" size={16} color={theme.secondary} />
          <Text style={{ fontSize: 13, color: theme.secondary }}>
            {daysSince != null ? `${daysSince}d since last weigh-in` : "No weigh-ins yet"}
          </Text>
        </View>
      </View>
      )}

      <Modal visible={trendsOpen} transparent animationType="slide" onRequestClose={() => setTrendsOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={() => setTrendsOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 32,
              maxHeight: "85%",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: theme.foreground }}>Trends</Text>
              <TouchableOpacity onPress={() => setTrendsOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 15, fontWeight: "700", color: theme.foreground, marginBottom: 8 }}>Weight</Text>
              {sparklinePoints ? (
                <View style={{ marginBottom: 8 }}>
                  <Svg width={chartW} height={chartH}>
                    <Polyline points={sparklinePoints} fill="none" stroke={primaryTeal} strokeWidth={2} />
                  </Svg>
                </View>
              ) : (
                <Text style={{ fontSize: 13, color: theme.secondary, marginBottom: 12 }}>
                  Log at least two weigh-ins to see a trend line.
                </Text>
              )}
              {weightLogs.length > 0 ? (
                <View style={{ marginBottom: 20 }}>
                  {weightLogs.map((log) => {
                    const w = convertWeight(log.weight_value, log.weight_unit as WeightUnit, displayUnit);
                    const dateStr = new Date(log.recorded_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    return (
                      <View
                        key={log.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                        }}
                      >
                        <Text style={{ fontSize: 14, color: theme.secondary }}>{dateStr}</Text>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }}>
                          {formatWeight(w, displayUnit)} {displayUnit}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={{ fontSize: 13, color: theme.secondary, marginBottom: 16 }}>No weigh-ins recorded yet.</Text>
              )}
              <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 4 }}>
                Intake and output trends can be added in a future update.
              </Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <DailyIntakeConfigModal
        visible={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        petId={petId}
        currentWaterTarget={waterTarget}
        currentFoodTarget={foodTarget}
        onSave={handleUpdateTargets}
      />

      <Modal visible={logOpen} transparent animationType="fade" onRequestClose={() => setLogOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }} onPress={() => setLogOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: theme.card, borderRadius: 16, padding: 20 }}
          >
            <Text style={{ fontSize: 17, fontWeight: "700", color: theme.foreground, marginBottom: 12 }}>Log weight</Text>
            <Text style={{ fontSize: 13, color: theme.secondary, marginBottom: 8 }}>Weight ({displayUnit})</Text>
            <TextInput
              value={logValue}
              onChangeText={setLogValue}
              keyboardType="decimal-pad"
              placeholder={`e.g. ${displayUnit === "lbs" ? "42" : "19"}`}
              placeholderTextColor={theme.secondary}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                padding: 12,
                color: theme.foreground,
                marginBottom: 12,
              }}
            />
            <Text style={{ fontSize: 13, color: theme.secondary, marginBottom: 8 }}>Goal weight ({displayUnit}, optional)</Text>
            <TextInput
              value={targetDraft}
              onChangeText={setTargetDraft}
              keyboardType="decimal-pad"
              placeholder="Sets your goal for comparisons"
              placeholderTextColor={theme.secondary}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                padding: 12,
                color: theme.foreground,
                marginBottom: 16,
              }}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
              <TouchableOpacity onPress={() => setLogOpen(false)}>
                <Text style={{ color: theme.secondary, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitLog} disabled={weightMutation.isPending}>
                <Text style={{ color: primaryTeal, fontWeight: "700" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
