import PrivateImage from "@/components/common/PrivateImage";
import { JournalNoteText } from "@/components/journal/JournalNoteText";
import PremiumFeatureLocked from "@/components/subscription/PremiumFeatureLocked";
import { subtypeLabel, type JournalDomain } from "@/constants/petJournal";
import { usePets } from "@/context/petsContext";
import { useSubscription } from "@/context/subscriptionContext";
import { useTheme } from "@/context/themeContext";
import { fetchHealthBriefingBundle } from "@/services/healthBriefing";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import moment from "moment";
import { journalEntryNeedsTriageAttention } from "@/utils/journalTriage";
import { latestVaccinationIdSet } from "@/utils/vaccinationGrouping";

function BriefingCard({
  children,
  tinted,
  isDark,
  borderColor,
}: {
  children: React.ReactNode;
  tinted?: boolean;
  isDark: boolean;
  borderColor: string;
}) {
  return (
    <View
      style={{
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        backgroundColor: tinted
          ? isDark
            ? "rgba(59,208,210,0.12)"
            : "rgba(59,208,210,0.18)"
          : isDark
            ? "rgba(255,255,255,0.06)"
            : "#FFFFFF",
        borderWidth: 1,
        borderColor,
      }}
    >
      {children}
    </View>
  );
}

export default function HealthBriefingScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pets } = usePets();
  const { canAccessFeature, isLoading: subLoading } = useSubscription();
  const canUseBriefing = canAccessFeature("health_briefing");
  const { petId } = useLocalSearchParams<{ petId?: string }>();

  const pet = pets.find((p) => p.id === petId);
  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";

  const { data, isLoading } = useQuery({
    queryKey: ["health_briefing", petId],
    queryFn: () => fetchHealthBriefingBundle(petId!),
    enabled: !!petId,
  });

  const summaryText = useMemo(() => {
    if (!data || !pet) return "";
    const parts: string[] = [];
    parts.push(`${pet.name} (${pet.breed}) — weight ${pet.weight_value} ${pet.weight_unit}.`);
    if (data.allergies.length > 0) {
      parts.push(`Allergies: ${data.allergies.map((a) => a.label).join(", ")}.`);
    }
    if (data.conditions.filter((c) => c.status === "active").length > 0) {
      parts.push(
        `Conditions: ${data.conditions
          .filter((c) => c.status === "active")
          .map((c) => c.name)
          .join(", ")}.`
      );
    }
    if (data.medicines.length > 0) {
      parts.push(`${data.medicines.length} active medication(s).`);
    }
    const latestVacIds = latestVaccinationIdSet(data.vaccinations);
    const overdueVacs = data.vaccinations.filter(
      (v) =>
        latestVacIds.has(v.id) &&
        v.next_due_date &&
        moment(v.next_due_date).startOf("day").isBefore(moment().startOf("day"))
    );
    if (overdueVacs.length > 0) {
      parts.push(`Overdue vaccines: ${overdueVacs.map((v) => v.name).join(", ")}.`);
    }
    const lastExam = data.exams[0];
    if (lastExam) {
      parts.push(`Last vet visit: ${lastExam.exam_date}${lastExam.clinic_name ? ` at ${lastExam.clinic_name}` : ""}.`);
    }
    const recent = data.journal
      .filter((j) => j.entry_date >= new Date(Date.now() - 21 * 864e5).toISOString().slice(0, 10))
      .slice(0, 5);
    if (recent.length > 0) {
      const lines = recent.map((j) => {
        const raw = (j.note || subtypeLabel(j.domain as JournalDomain, j.subtype)).trim();
        const short = raw.length > 140 ? `${raw.slice(0, 137)}…` : raw;
        return `• ${j.entry_date} (${j.domain}): ${short}`;
      });
      parts.push(`Recent journal (last 3 weeks):\n${lines.join("\n")}`);
    }
    return parts.join("\n\n");
  }, [data, pet]);

  const vetFlagged = data?.journal.filter((j) => journalEntryNeedsTriageAttention(j)) ?? [];

  const shareBriefing = async () => {
    if (!pet || !summaryText) return;
    try {
      await Share.share({
        title: `Health briefing — ${pet.name}`,
        message: `${pet.name}'s vet-ready overview\n\n${summaryText}`,
      });
    } catch {
      /* cancelled */
    }
  };

  if (!petId || !pet) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <Text style={{ color: theme.secondary }}>Missing pet</Text>
      </View>
    );
  }

  if (subLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  if (!canUseBriefing) {
    return (
      <PremiumFeatureLocked
        title="Health Briefing"
        onGoBack={() => router.back()}
        feature="health_briefing_screen"
      />
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          gap: 12,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
          }}
        >
          {pet.photo_url ? (
            <PrivateImage bucketName="pets" filePath={pet.photo_url} style={{ width: 48, height: 48 }} />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="paw" size={22} color={theme.secondary} />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: theme.foreground }}>Health Briefing</Text>
            <Ionicons name="sparkles" size={18} color={theme.primary} />
          </View>
          <Text style={{ fontSize: 14, color: theme.secondary, marginTop: 2 }}>
            {pet.name}&apos;s vet-ready overview
          </Text>
        </View>
        <TouchableOpacity onPress={shareBriefing} style={{ padding: 8 }}>
          <Ionicons name="share-outline" size={22} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="close" size={26} color={theme.foreground} />
        </TouchableOpacity>
      </View>

      {isLoading || !data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 32,
          }}
          showsVerticalScrollIndicator={false}
        >
          <BriefingCard tinted isDark={isDark} borderColor={borderColor}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Ionicons name="pulse-outline" size={20} color={theme.primary} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  letterSpacing: 0.6,
                  color: theme.secondary,
                }}
              >
                SUMMARY
              </Text>
            </View>
            <Text style={{ fontSize: 15, lineHeight: 22, color: theme.foreground }}>{summaryText}</Text>
          </BriefingCard>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
            <View style={{ width: "48%", flexGrow: 1 }}>
              <BriefingCard isDark={isDark} borderColor={borderColor}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Ionicons name="scale-outline" size={22} color={theme.primary} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F97316" }} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.secondary, marginTop: 8 }}>WEIGHT</Text>
                <Text style={{ fontSize: 18, fontWeight: "700", color: theme.foreground, marginTop: 4 }}>
                  {pet.weight_value} {pet.weight_unit}
                </Text>
              </BriefingCard>
            </View>
            <View style={{ width: "48%", flexGrow: 1 }}>
              <BriefingCard isDark={isDark} borderColor={borderColor}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Ionicons name="shield-checkmark-outline" size={22} color={theme.primary} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F97316" }} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.secondary, marginTop: 8 }}>ALLERGIES</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground, marginTop: 4 }} numberOfLines={2}>
                  {data.allergies.length > 0
                    ? data.allergies
                        .map((a) => a.label)
                        .join(", ")
                    : "None recorded"}
                </Text>
              </BriefingCard>
            </View>
            <View style={{ width: "48%", flexGrow: 1 }}>
              <BriefingCard isDark={isDark} borderColor={borderColor}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Ionicons name="medical-outline" size={22} color={theme.primary} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6" }} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.secondary, marginTop: 8 }}>
                  MEDICATIONS
                </Text>
                <Text style={{ fontSize: 18, fontWeight: "700", color: theme.foreground, marginTop: 4 }}>
                  {data.medicines.length} active
                </Text>
                {data.medicines[0] ? (
                  <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 4 }} numberOfLines={2}>
                    {data.medicines[0].name}
                  </Text>
                ) : null}
              </BriefingCard>
            </View>
            <View style={{ width: "48%", flexGrow: 1 }}>
              <BriefingCard isDark={isDark} borderColor={borderColor}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Ionicons name="fitness-outline" size={22} color={theme.primary} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" }} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.secondary, marginTop: 8 }}>
                  LAST VET VISIT
                </Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground, marginTop: 4 }}>
                  {data.exams[0]?.exam_date ?? "—"}
                </Text>
                {data.exams[0]?.clinic_name ? (
                  <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 4 }} numberOfLines={2}>
                    {data.exams[0].clinic_name}
                  </Text>
                ) : null}
              </BriefingCard>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
            <TouchableOpacity onPress={() => router.push(`/(home)/pet-journal/add-allergy?petId=${petId}` as any)}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.primary }}>+ Add allergy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push(`/(home)/pet-journal/add-condition?petId=${petId}` as any)}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.primary }}>+ Add condition</Text>
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 0.5,
              color: theme.secondary,
              marginBottom: 8,
              marginTop: 8,
            }}
          >
            CONDITIONS
          </Text>
          <BriefingCard isDark={isDark} borderColor={borderColor}>
            {data.conditions.filter((c) => c.status === "active").length === 0 ? (
              <Text style={{ color: theme.secondary, fontSize: 14 }}>No active conditions recorded</Text>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {data.conditions
                  .filter((c) => c.status === "active")
                  .map((c) => (
                    <View
                      key={c.id}
                      style={{
                        backgroundColor: "rgba(249,115,22,0.15)",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 100,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#C2410C" }}>{c.name}</Text>
                    </View>
                  ))}
              </View>
            )}
          </BriefingCard>

          {vetFlagged.length > 0 && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 16,
                  marginBottom: 10,
                }}
              >
                <Ionicons name="warning-outline" size={22} color="#D97706" />
                <Text style={{ fontSize: 17, fontWeight: "700", color: theme.foreground }}>Flagged for Vet</Text>
              </View>
              <View
                style={{
                  backgroundColor: isDark ? "rgba(251,191,36,0.12)" : "rgba(254,243,199,0.9)",
                  borderRadius: 16,
                  padding: 12,
                  gap: 10,
                }}
              >
                {vetFlagged.map((j) => (
                  <BriefingCard key={j.id} isDark={isDark} borderColor="rgba(217,119,6,0.25)">
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                      <Ionicons name="flag-outline" size={20} color="#D97706" />
                      <View style={{ flex: 1 }}>
                        <JournalNoteText
                          text={j.note || subtypeLabel(j.domain as JournalDomain, j.subtype)}
                        />
                        <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 6 }}>
                          {j.entry_date} · {j.domain}
                        </Text>
                      </View>
                    </View>
                  </BriefingCard>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
