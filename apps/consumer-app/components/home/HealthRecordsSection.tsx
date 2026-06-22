import {
  FIGMA_HEALTH_EXAMS_ICON_BG,
  FIGMA_HEALTH_LABS_ICON_BG,
  FIGMA_HEALTH_MEDS_ICON_BG,
  FIGMA_HEALTH_TEAL,
  HEALTH_ELEVATION,
  HEALTH_LAYOUT,
  dashboardCareTeamCardChrome,
  dashboardIconPlateMuted,
} from "@/constants/figmaHealthLayout";
import { useTheme } from "@/context/themeContext";
import { fetchMedicines } from "@/services/medicines";
import { fetchClinicalExams } from "@/services/clinicalExams";
import { fetchLabResults } from "@/services/labResults";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useVaccineCategories } from "@/hooks/useVaccineCategories";
import { petPossessiveLabel } from "@/utils/petCopy";
import { buildVaccineHubSummary } from "@/utils/vaccineHubSummary";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import moment from "moment";
import React, { useMemo } from "react";
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from "react-native";

type HealthRecordsSectionProps = {
  petId: string;
  /** Used for the empty-state headline (screenshot / Figma) */
  petName: string;
  /** `hub` = full Health Records landing (Figma 2033:133716); `dashboard` = home preview */
  variant?: "dashboard" | "hub";
  /** Set false when the parent screen renders the “Health Records” title */
  showTitle?: boolean;
  /** e.g. navigate to full hub from home dashboard */
  onTitlePress?: () => void;
};

function formatHubDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return moment(iso).format("MMM D, YYYY");
}

type BadgeVariant = "success" | "info" | "infoBlue" | "warning" | "neutral";

function StatusBadge({
  label,
  variant,
  isDark,
}: {
  label: string;
  variant: BadgeVariant;
  isDark: boolean;
}) {
  const colors: Record<BadgeVariant, { bg: string; text: string }> = {
    success: {
      bg: isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.12)",
      text: isDark ? "#4ADE80" : "#15803D",
    },
    info: {
      bg: isDark ? "rgba(59,208,210,0.2)" : "rgba(59,208,210,0.15)",
      text: isDark ? "#3BD0D2" : "#0E7490",
    },
    infoBlue: {
      bg: isDark ? "rgba(59,130,246,0.22)" : "rgba(59,130,246,0.12)",
      text: isDark ? "#93C5FD" : "#1D4ED8",
    },
    warning: {
      bg: isDark ? "rgba(251,191,36,0.2)" : "rgba(251,191,36,0.2)",
      text: isDark ? "#FBBF24" : "#B45309",
    },
    neutral: {
      bg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      text: isDark ? "rgba(255,255,255,0.7)" : "#5A5F6A",
    },
  };
  const c = colors[variant];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 100,
        backgroundColor: c.bg,
        alignSelf: "flex-start",
      }}
    >
      {variant === "success" && (
        <Ionicons name="checkmark-circle" size={14} color={c.text} />
      )}
      <Text style={{ fontSize: 12, fontWeight: "600", color: c.text }}>{label}</Text>
    </View>
  );
}

export default function HealthRecordsSection({
  petId,
  petName,
  variant = "dashboard",
  showTitle = true,
  onTitlePress,
}: HealthRecordsSectionProps) {
  const { theme, mode } = useTheme();
  const router = useRouter();
  const isDark = mode === "dark";
  const isHub = variant === "hub";
  const isAndroid = Platform.OS === "android";
  const cardBorderStyle = isAndroid
    ? {}
    : { borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" };
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF";
  const hubIconPlate = dashboardIconPlateMuted(isDark);
  const hubIconInk = isDark ? theme.foreground : theme.primary;

  const { data: vaccinations = [], isLoading: loadingVac } = useQuery({
    queryKey: ["vaccinations", petId],
    queryFn: () => getVaccinationsByPetId(petId),
    enabled: !!petId,
  });

  const { data: medicines = [], isLoading: loadingMed } = useQuery({
    queryKey: ["medicines", petId],
    queryFn: () => fetchMedicines(petId),
    enabled: !!petId,
  });

  const { data: exams = [], isLoading: loadingEx } = useQuery({
    queryKey: ["clinicalExams", petId],
    queryFn: () => fetchClinicalExams(petId),
    enabled: !!petId,
  });

  const { data: labs = [], isLoading: loadingLab } = useQuery({
    queryKey: ["labResults", petId],
    queryFn: () => fetchLabResults(petId),
    enabled: !!petId,
  });

  const { requiredVaccinesStatus, isLoadingRequirements } = useVaccineCategories();

  const loading = loadingVac || loadingMed || loadingEx || loadingLab || isLoadingRequirements;

  /** Avoid "your pet's …" on hub when name fallback is used */
  const petNameForTitles = petName === "your pet" ? undefined : petName;

  const vaccineSummary = useMemo(() => {
    if (isLoadingRequirements) {
      return {
        badge: { label: "Loading…", variant: "neutral" as BadgeVariant },
        primary: "Checking vaccine status",
        secondary: null as string | null,
        nextLine: null as string | null,
      };
    }

    const hub = buildVaccineHubSummary(vaccinations, requiredVaccinesStatus, {
      hasRequirementsModel: requiredVaccinesStatus.total > 0,
    });

    return {
      badge: {
        label: hub.badge.label,
        variant: hub.badge.variant as BadgeVariant,
      },
      primary: hub.primary,
      secondary: hub.secondary,
      nextLine: hub.nextLine,
    };
  }, [vaccinations, requiredVaccinesStatus, isLoadingRequirements]);

  const medSummary = useMemo(() => {
    const now = new Date();
    const active = medicines.filter((m) => {
      if (!m.end_date) return true;
      const end = new Date(m.end_date);
      end.setHours(23, 59, 59, 999);
      return end >= now;
    });
    if (medicines.length === 0) {
      return {
        badge: { label: "No records", variant: "neutral" as BadgeVariant },
        primary: "No medications yet",
        tags: [] as string[],
        sub: null as string | null,
      };
    }
    const first = active[0] ?? medicines[0];
    const dosage = [first.dosage, first.frequency].filter(Boolean).join(" · ");
    const line = [first.name, dosage].filter(Boolean).join(" · ");
    const otherNames = active
      .map((m) => m.name)
      .filter((n, i, a) => n && a.indexOf(n) === i)
      .filter((n) => n !== first.name)
      .slice(0, 2);
    return {
      badge: {
        label: active.length > 0 ? `${active.length} Ongoing` : "Completed",
        variant: active.length > 0 ? ("infoBlue" as BadgeVariant) : ("success" as BadgeVariant),
      },
      primary: line || "Medications",
      tags: otherNames,
      sub: null,
    };
  }, [medicines]);

  const examSummary = useMemo(() => {
    if (exams.length === 0) {
      return {
        badge: { label: "No records", variant: "neutral" as BadgeVariant },
        primary: "No exams recorded",
        dateLabel: null as string | null,
        date: null as string | null,
        clinic: null as string | null,
      };
    }
    const last = exams[0];
    const d = last.exam_date || last.created_at;
    return {
      badge: { label: "Up to Date", variant: "success" as BadgeVariant },
      primary: last.exam_type || "Recent exam",
      dateLabel: "Last Exam",
      date: formatHubDate(d),
      clinic: last.clinic_name || null,
    };
  }, [exams]);

  const labSummary = useMemo(() => {
    if (labs.length === 0) {
      return {
        badge: { label: "No records", variant: "neutral" as BadgeVariant },
        primary: "No lab results yet",
        dateLabel: null as string | null,
        date: null as string | null,
      };
    }
    const last = labs[0];
    const d = last.test_date || last.created_at;
    return {
      badge: { label: "All Normal", variant: "success" as BadgeVariant },
      primary: last.test_type || "Recent lab",
      dateLabel: "Last Blood Panel",
      date: formatHubDate(d),
    };
  }, [labs]);

  const hubEmpty =
    !loading &&
    vaccinations.length === 0 &&
    medicines.length === 0 &&
    exams.length === 0 &&
    labs.length === 0;

  const hubCards = [
    {
      id: "vaccines",
      hubShortTitle: "Vaccines",
      title: petPossessiveLabel(petNameForTitles, "Vaccinations"),
      route: `/(home)/health-record/${petId}/(tabs)/vaccinations` as const,
      addRoute: `/(home)/health-record/${petId}/vaccination-upload-modal?upload=library` as const,
      /** Figma 1340:33860 — solid brand teal disc, not tinted plate */
      iconBg: FIGMA_HEALTH_TEAL,
      icon: <MaterialCommunityIcons name="heart-pulse" size={22} color="#FFFFFF" />,
      badge: vaccineSummary.badge,
      hubEmptyBadge: { label: "Not Set", variant: "info" as BadgeVariant },
      hubEmptyLine: "No Vaccines Recorded Yet",
      hubAddLabel: "+ Add Vaccine Record",
      showHubAddButton: false,
      body: vaccineSummary,
      type: "vaccine" as const,
    },
    {
      id: "meds",
      hubShortTitle: "Medications",
      title: petPossessiveLabel(petNameForTitles, "Medications"),
      route: `/(home)/health-record/${petId}/(tabs)/medications` as const,
      /** Empty hub: Meds tab (empty state + FAB); + opens Add Medication sheet */
      addRoute: `/(home)/health-record/${petId}/(tabs)/medications` as const,
      iconBg: FIGMA_HEALTH_MEDS_ICON_BG,
      icon: <MaterialCommunityIcons name="pill" size={22} color="#FFFFFF" />,
      badge: medSummary.badge,
      hubEmptyBadge: { label: "None Active", variant: "infoBlue" as BadgeVariant },
      hubEmptyLine: "No Medications Recorded Yet",
      hubAddLabel: "+ Add Medication Record",
      showHubAddButton: false,
      body: medSummary,
      type: "med" as const,
    },
    {
      id: "exams",
      hubShortTitle: "Clinical visits",
      title: petPossessiveLabel(petNameForTitles, "Exams"),
      route: `/(home)/health-record/${petId}/(tabs)/exams` as const,
      /** Empty hub: Exams tab (empty state + FAB); + opens Upload Exam Documents sheet */
      addRoute: `/(home)/health-record/${petId}/(tabs)/exams` as const,
      iconBg: FIGMA_HEALTH_EXAMS_ICON_BG,
      icon: <MaterialCommunityIcons name="stethoscope" size={22} color="#FFFFFF" />,
      badge: examSummary.badge,
      hubEmptyBadge: { label: "No Records", variant: "warning" as BadgeVariant },
      hubEmptyLine: "No Exams Recorded Yet",
      hubAddLabel: "+ Add Exam Record",
      showHubAddButton: false,
      body: examSummary,
      type: "exam" as const,
    },
    {
      id: "labs",
      hubShortTitle: "Labs",
      title: petPossessiveLabel(petNameForTitles, "Lab Results"),
      route: `/(home)/health-record/${petId}/(tabs)/lab-results` as const,
      /** Empty hub: go to Labs tab (empty state + FAB); user taps + for Upload Lab Result sheet */
      addRoute: `/(home)/health-record/${petId}/(tabs)/lab-results` as const,
      iconBg: FIGMA_HEALTH_LABS_ICON_BG,
      icon: <Ionicons name="flask" size={22} color="#FFFFFF" />,
      badge: labSummary.badge,
      hubEmptyBadge: { label: "No Data", variant: "neutral" as BadgeVariant },
      hubEmptyLine: "No Lab Results Recorded Yet",
      hubAddLabel: "+ Add Lab Result",
      showHubAddButton: false,
      body: labSummary,
      type: "lab" as const,
    },
  ];

  return (
    <View style={{ paddingHorizontal: isHub ? 0 : 20 }}>
      {showTitle &&
        (onTitlePress ? (
          <TouchableOpacity onPress={onTitlePress} activeOpacity={0.7} style={{ marginBottom: hubEmpty && !isHub ? 18 : 16 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: isDark ? "#FFFFFF" : "#0D0F0F",
                lineHeight: 29,
              }}
            >
              {petPossessiveLabel(petName, "Health Records")}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: isDark ? "#FFFFFF" : "#0D0F0F",
              lineHeight: 29,
              marginBottom: hubEmpty && !isHub ? 18 : 16,
            }}
          >
            {petPossessiveLabel(petName, "Health Records")}
          </Text>
        ))}

      {hubEmpty && !isHub && (
        <View style={{ marginBottom: 22, paddingHorizontal: 4 }}>
          <Text
            style={{
              textAlign: "center",
              fontSize: 22,
              fontWeight: "700",
              color: theme.foreground,
              lineHeight: 30,
            }}
          >
            Keep all of{" "}
            <Text style={{ color: theme.primary }}>{petName}</Text>
            {"'s health history in one secure place."}
          </Text>
          <Text
            style={{
              textAlign: "center",
              marginTop: 12,
              fontSize: 15,
              lineHeight: 22,
              color: theme.secondary,
              paddingHorizontal: 6,
            }}
          >
            You&apos;ll never miss a booster shot again! Organize vaccinations, lab results, and vet visits
            effortlessly.
          </Text>
        </View>
      )}

      {loading ? (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : isHub ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: HEALTH_LAYOUT.cardGap,
          }}
        >
          {hubCards.map((card) => {
            const hubCardEmpty =
              (card.type === "vaccine" && vaccinations.length === 0) ||
              (card.type === "med" && medicines.length === 0) ||
              (card.type === "exam" && exams.length === 0) ||
              (card.type === "lab" && labs.length === 0);

            const docCount =
              card.type === "vaccine"
                ? vaccinations.length
                : card.type === "med"
                  ? medicines.length
                  : card.type === "exam"
                    ? exams.length
                    : labs.length;

            const hubTileShell = {
              width: "48%" as const,
              borderRadius: 16,
              padding: 12,
              ...dashboardCareTeamCardChrome(isDark),
              ...(!isDark ? HEALTH_ELEVATION.cardLight : {}),
            };

            const hubGlyph =
              card.type === "vaccine" ? (
                <MaterialCommunityIcons name="heart-pulse" size={20} color={hubIconInk} />
              ) : card.type === "med" ? (
                <MaterialCommunityIcons name="pill" size={20} color={hubIconInk} />
              ) : card.type === "exam" ? (
                <MaterialCommunityIcons name="stethoscope" size={20} color={hubIconInk} />
              ) : (
                <Ionicons name="flask" size={20} color={hubIconInk} />
              );

            const compactLine =
              card.type === "vaccine"
                ? (card.body as typeof vaccineSummary).primary
                : card.type === "med"
                  ? (card.body as typeof medSummary).primary
                  : card.type === "exam"
                    ? (card.body as typeof examSummary).primary
                    : (card.body as typeof labSummary).primary;

            return hubCardEmpty ? (
              <View key={card.id} style={hubTileShell}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(card.route as any)}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: hubIconPlate,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {hubGlyph}
                    </View>
                    <MaterialCommunityIcons name="arrow-top-right" size={18} color={theme.secondary} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: theme.foreground, marginTop: 10 }}>
                    {card.hubShortTitle}
                  </Text>
                  <View style={{ marginTop: 6 }}>
                    <StatusBadge
                      label={card.hubEmptyBadge.label}
                      variant={card.hubEmptyBadge.variant}
                      isDark={isDark}
                    />
                  </View>
                  <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 8 }} numberOfLines={2}>
                    {card.hubEmptyLine}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.secondary, marginTop: 8 }}>
                    {docCount} {docCount === 1 ? "record" : "records"}
                  </Text>
                </TouchableOpacity>
                {card.showHubAddButton !== false ? (
                  <TouchableOpacity
                    onPress={() => router.push(card.addRoute as any)}
                    activeOpacity={0.85}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      marginTop: 10,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : theme.dashedCard,
                    }}
                  >
                    <Ionicons name="add" size={18} color={theme.foreground} />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground }}>
                      {card.hubAddLabel.replace(/^\+ /, "")}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <TouchableOpacity
                key={card.id}
                activeOpacity={0.85}
                onPress={() => router.push(card.route as any)}
                style={hubTileShell}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: hubIconPlate,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {hubGlyph}
                  </View>
                  <MaterialCommunityIcons name="arrow-top-right" size={18} color={theme.secondary} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.foreground, marginTop: 10 }}>
                  {card.hubShortTitle}
                </Text>
                <View style={{ marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  <StatusBadge label={card.badge.label} variant={card.badge.variant} isDark={isDark} />
                </View>
                <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 8 }} numberOfLines={2}>
                  {compactLine}
                </Text>
                <Text style={{ fontSize: 11, color: theme.secondary, marginTop: 8 }}>
                  {docCount} {docCount === 1 ? "record" : "records"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {hubCards.map((card) => {
            const hubCardEmpty =
              isHub &&
              ((card.type === "vaccine" && vaccinations.length === 0) ||
                (card.type === "med" && medicines.length === 0) ||
                (card.type === "exam" && exams.length === 0) ||
                (card.type === "lab" && labs.length === 0));

            const cardShellStyle = {
              backgroundColor: cardBg,
              borderRadius: 20,
              padding: 16,
              ...cardBorderStyle,
              ...(isHub && !isDark ? HEALTH_ELEVATION.cardLight : {}),
            };

            const headerRow = (
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: card.iconBg,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  {card.icon}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>{card.title}</Text>
                    <StatusBadge
                      label={hubCardEmpty ? card.hubEmptyBadge.label : card.badge.label}
                      variant={hubCardEmpty ? card.hubEmptyBadge.variant : card.badge.variant}
                      isDark={isDark}
                    />
                  </View>
                </View>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                  }}
                >
                  <MaterialCommunityIcons name="arrow-top-right" size={20} color={theme.secondary} />
                </View>
              </View>
            );

            return hubCardEmpty ? (
              <View key={card.id} style={cardShellStyle}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(card.route as any)}>
                  {headerRow}
                </TouchableOpacity>
                <View style={{ marginTop: 8 }}>
                  <Text
                    style={{
                      textAlign: "center",
                      fontSize: 14,
                      color: theme.secondary,
                      marginBottom: card.showHubAddButton !== false ? 14 : 0,
                    }}
                  >
                    {card.hubEmptyLine}
                  </Text>
                  {card.showHubAddButton !== false ? (
                    <TouchableOpacity
                      onPress={() => router.push(card.addRoute as any)}
                      activeOpacity={0.85}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        paddingVertical: 12,
                        borderRadius: 14,
                        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
                      }}
                    >
                      <Ionicons name="add" size={20} color={theme.foreground} />
                      <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }}>
                        {card.hubAddLabel.replace(/^\+ /, "")}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : (
            <TouchableOpacity
              key={card.id}
              activeOpacity={0.85}
              onPress={() => router.push(card.route as any)}
              style={cardShellStyle}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: card.iconBg,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  {card.icon}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>{card.title}</Text>
                    <StatusBadge label={card.badge.label} variant={card.badge.variant} isDark={isDark} />
                  </View>

                  {card.type === "vaccine" && (
                    <>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }} numberOfLines={2}>
                        {(card.body as typeof vaccineSummary).primary}
                      </Text>
                      {(card.body as typeof vaccineSummary).secondary && (card.body as typeof vaccineSummary).nextLine && (
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 16 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Ionicons name="time-outline" size={16} color={theme.secondary} />
                            <View>
                              <Text style={{ fontSize: 11, color: theme.secondary }}>{(card.body as typeof vaccineSummary).nextLine}</Text>
                              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground }}>
                                {(card.body as typeof vaccineSummary).secondary}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </>
                  )}

                  {card.type === "med" && (
                    <>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }} numberOfLines={2}>
                        {(card.body as typeof medSummary).primary}
                      </Text>
                      {(card.body as typeof medSummary).tags.length > 0 && (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {(card.body as typeof medSummary).tags.map((t) => (
                            <View
                              key={t}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 100,
                                borderWidth: 1,
                                borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)",
                                backgroundColor: "transparent",
                              }}
                            >
                              <Text style={{ fontSize: 12, color: theme.secondary }}>{t}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}

                  {card.type === "exam" && (
                    <View style={{ marginTop: 4, gap: 10 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }} numberOfLines={2}>
                        {(card.body as typeof examSummary).primary}
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
                        {(card.body as typeof examSummary).date ? (
                          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                            <Ionicons name="calendar-outline" size={16} color={theme.secondary} style={{ marginTop: 2 }} />
                            <View>
                              <Text style={{ fontSize: 11, color: theme.secondary }}>
                                {(card.body as typeof examSummary).dateLabel}
                              </Text>
                              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground }}>
                                {(card.body as typeof examSummary).date}
                              </Text>
                            </View>
                          </View>
                        ) : null}
                        {(card.body as typeof examSummary).clinic ? (
                          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, flex: 1, minWidth: 120 }}>
                            <Ionicons name="business-outline" size={16} color={theme.secondary} style={{ marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, color: theme.secondary }}>Clinic</Text>
                              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground }} numberOfLines={2}>
                                {(card.body as typeof examSummary).clinic}
                              </Text>
                            </View>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  )}

                  {card.type === "lab" && (
                    <>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }} numberOfLines={2}>
                        {(card.body as typeof labSummary).primary}
                      </Text>
                      {(card.body as typeof labSummary).date && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
                          <Ionicons name="calendar-outline" size={16} color={theme.secondary} />
                          <View>
                            <Text style={{ fontSize: 11, color: theme.secondary }}>
                              {(card.body as typeof labSummary).dateLabel}
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground }}>
                              {(card.body as typeof labSummary).date}
                            </Text>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </View>

                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                  }}
                >
                  <MaterialCommunityIcons name="arrow-top-right" size={20} color={theme.secondary} />
                </View>
              </View>
            </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
