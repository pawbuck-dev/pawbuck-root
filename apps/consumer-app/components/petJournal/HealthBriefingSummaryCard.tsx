import { HEALTH_BRIEFING_FOOTER_DISCLAIMER } from "@/constants/miloDisclaimers";
import PrivateImage from "@/components/common/PrivateImage";
import type { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { fetchHealthBriefingBundle } from "@/services/healthBriefing";
import {
  computeBriefingCategorySignals,
  formatHealthBriefingSubtitle,
  type BriefingCategoryKey,
} from "@/utils/healthBriefingUi";
import { journalEntryNeedsTriageAttention } from "@/utils/journalTriage";
import { formatLastJournalContinuityLine } from "@/utils/journalContinuity";
import { truncateAtSentenceOrWord } from "@/utils/textTruncate";
import { formatPetWeightForDisplay } from "@/utils/weightUnits";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from "react-native";

const CATEGORY_LABEL: Record<BriefingCategoryKey, string> = {
  weight: "Weight",
  allergies: "Allergies",
  vaccines: "Vaccines",
  meds: "Meds",
};

type Props = {
  petId: string;
  pet: Pet | undefined;
  onPress: () => void;
  /** When set, replaces default helper line under title. */
  helperText?: string;
  /** Home dashboard: hide duplicate pet photo; show Milo output icon instead. */
  hidePetAvatar?: boolean;
  /** Override card title (e.g. "Vet briefing" on home). */
  title?: string;
};

export default function HealthBriefingSummaryCard({
  petId,
  pet,
  onPress,
  helperText,
  hidePetAvatar = false,
  title = "Health Briefing",
}: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const [subtitleExpanded, setSubtitleExpanded] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["health_briefing", petId],
    queryFn: () => fetchHealthBriefingBundle(petId),
    enabled: !!petId,
  });

  const borderStyle =
    Platform.OS === "android"
      ? {}
      : {
          borderWidth: 1 as const,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        };

  const vetFlaggedCount = useMemo(
    () => data?.journal.filter((j) => journalEntryNeedsTriageAttention(j)).length ?? 0,
    [data?.journal]
  );

  const activeConditionsCount =
    data?.conditions.filter((c) => c.status === "active").length ?? 0;

  const subtitle = useMemo(() => {
    if (!pet) return "";
    return formatHealthBriefingSubtitle({
      petName: pet.name,
      weightValue: pet.weight_value,
      weightUnit: pet.weight_unit,
      allergiesCount: data?.allergies.length ?? 0,
      activeConditionsCount,
    });
  }, [pet, data?.allergies.length, activeConditionsCount]);

  useEffect(() => {
    setSubtitleExpanded(false);
  }, [petId, subtitle]);

  const subtitleCollapsed = useMemo(() => truncateAtSentenceOrWord(subtitle, 96), [subtitle]);

  const categories = useMemo(() => {
    if (!data) return null;
    return computeBriefingCategorySignals({
      weightValue: pet?.weight_value,
      allergiesCount: data.allergies.length,
      vaccinations: data.vaccinations,
      medicines: data.medicines,
    });
  }, [data, pet?.weight_value]);

  const needsAttentionHeader = useMemo(() => {
    if (!categories) return false;
    return vetFlaggedCount > 0 || categories.some((c) => !c.ok);
  }, [categories, vetFlaggedCount]);

  const pendingSubtitle = useMemo(() => {
    if (!pet || data) return "";
    const w = formatPetWeightForDisplay(pet.weight_value, pet.weight_unit);
    return w ? `${pet.name} · ${w}` : pet.name;
  }, [pet, data]);

  const lastJournalLine = useMemo(() => {
    const latest = data?.journal?.[0];
    return formatLastJournalContinuityLine(latest);
  }, [data?.journal]);

  if (!pet) return null;

  const summaryReady = !!data && !!categories;
  const journalNoteCount = data?.journal?.length ?? 0;
  const needsJournalForBriefing = summaryReady && journalNoteCount === 0;

  const headerIcon = hidePetAvatar ? (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        backgroundColor: isDark ? "rgba(56, 189, 189, 0.2)" : "rgba(59, 208, 210, 0.18)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="document-text" size={22} color={theme.primary} />
    </View>
  ) : (
    <View style={{ position: "relative", marginRight: 12 }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          overflow: "hidden",
          borderWidth: 2,
          borderColor: theme.primary,
          backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
        }}
      >
        {pet.photo_url ? (
          <PrivateImage bucketName="pets" filePath={pet.photo_url} style={{ width: 48, height: 48 }} />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="paw" size={22} color={theme.secondary} />
          </View>
        )}
      </View>
      <View
        style={{
          position: "absolute",
          right: -1,
          bottom: -1,
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: "#22C55E",
          borderWidth: 2,
          borderColor: isDark ? theme.background : "#FFFFFF",
        }}
      />
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 16,
        ...borderStyle,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {headerIcon}

        <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          {hidePetAvatar ? (
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.6,
                color: theme.secondary,
                marginBottom: 4,
              }}
            >
              OUTPUT
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: theme.foreground }}>{title}</Text>
            <Ionicons name="sparkles" size={18} color={theme.primary} />
          </View>
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 13, color: theme.secondary }}>
              {needsJournalForBriefing
                ? "Add a daily note above and Milo will enrich this summary."
                : isPending && !data
                  ? pendingSubtitle
                  : subtitleExpanded
                    ? subtitle
                    : subtitleCollapsed.preview}
            </Text>
            {!needsJournalForBriefing && !isPending && data && subtitleCollapsed.truncated && !subtitleExpanded ? (
              <TouchableOpacity
                onPress={() => setSubtitleExpanded(true)}
                hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
                style={{ marginTop: 4 }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.primary }}>Show more</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {lastJournalLine && !needsJournalForBriefing ? (
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: theme.primary,
                marginTop: 6,
                lineHeight: 17,
              }}
            >
              {lastJournalLine}
            </Text>
          ) : null}
          {!hidePetAvatar ? (
            <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 6, lineHeight: 17 }}>
              {helperText ??
                "Vet-ready summary from journal notes, allergies, conditions, vaccines & meds."}
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {summaryReady && needsAttentionHeader ? (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(249,115,22,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="warning" size={20} color="#F97316" />
            </View>
          ) : null}
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.secondary} />
          </View>
        </View>
      </View>

      <View
        style={{
          height: 1,
          backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          marginVertical: 14,
        }}
      />

      {!summaryReady ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 28 }}>
          <ActivityIndicator color={theme.primary} />
          <Text style={{ fontSize: 12, color: theme.secondary }}>Loading health snapshot…</Text>
        </View>
      ) : needsJournalForBriefing ? (
        <View style={{ gap: 12 }}>
          <View
            style={{
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            }}
          >
            <Text style={{ fontSize: 13, color: theme.secondary, lineHeight: 19 }}>
              Records and vaccines still appear here. Daily notes help Milo explain recent changes at the vet.
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
            {categories!.map((c) => (
              <View
                key={c.key}
                style={{ flexDirection: "row", alignItems: "center", marginRight: 12, marginBottom: 4 }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: c.ok ? "#22C55E" : "#F97316",
                    marginRight: 6,
                  }}
                />
                <Text style={{ fontSize: 12, color: theme.secondary }}>{CATEGORY_LABEL[c.key]}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
            {categories!.map((c) => (
              <View
                key={c.key}
                style={{ flexDirection: "row", alignItems: "center", marginRight: 12, marginBottom: 4 }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: c.ok ? "#22C55E" : "#F97316",
                    marginRight: 6,
                  }}
                />
                <Text style={{ fontSize: 12, color: theme.secondary }}>{CATEGORY_LABEL[c.key]}</Text>
              </View>
            ))}
          </View>
          {vetFlaggedCount > 0 ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 100,
                backgroundColor: "rgba(249,115,22,0.18)",
              }}
            >
              <Ionicons name="flag" size={14} color="#C2410C" />
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#C2410C" }}>
                {vetFlaggedCount} flagged
              </Text>
            </View>
          ) : null}
        </View>
      )}

      <Text
        style={{
          fontSize: 10,
          lineHeight: 14,
          color: theme.secondary,
          marginTop: 12,
        }}
      >
        {HEALTH_BRIEFING_FOOTER_DISCLAIMER}
      </Text>
    </TouchableOpacity>
  );
}
