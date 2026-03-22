import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import {
  OverflowAction,
  RecordOverflowSheet,
} from "@/components/health/RecordOverflowSheet";
import {
  FIGMA_HEALTH_TEAL,
  HEALTH_LAYOUT,
  HEALTH_TYPE,
  healthDetailCardChrome,
  healthDetailHeaderChrome,
  healthDetailScreenBg,
} from "@/constants/figmaHealthLayout";
import { VaccinationEditModal } from "@/components/vaccinations/VaccinationEditModal";
import { useTheme } from "@/context/themeContext";
import { useVaccinations } from "@/context/vaccinationsContext";
import { Tables, TablesUpdate } from "@/database.types";
import { VaccineCategory } from "@/services/vaccineRequirements";
import { formatDateLong } from "@/utils/dates";
import { shareStorageDocument, shareTextSummary } from "@/utils/documentShare";
import { categorySubtitle, getVaccineDueBadge } from "@/utils/vaccinationUi";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BADGE_STYLES: Record<
  "overdue" | "dueGreen" | "dueOrange",
  { bg: string; text: string }
> = {
  overdue: { bg: "rgba(239, 68, 68, 0.12)", text: "#DC2626" },
  dueGreen: { bg: "rgba(34, 197, 94, 0.12)", text: "#15803D" },
  dueOrange: { bg: "rgba(251, 146, 60, 0.16)", text: "#C2410C" },
};

function parseCategory(raw: string | string[] | undefined): VaccineCategory {
  const c = Array.isArray(raw) ? raw[0] : raw;
  if (c === "required" || c === "recommended" || c === "other") return c;
  return "other";
}

function documentFileLabel(path: string | null | undefined): string {
  if (!path) return "document.pdf";
  const seg = path.split("/").pop() || "document.pdf";
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

export default function VaccinationDetailScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const insets = useSafeAreaInsets();
  const { vaccinations, updateVaccinationMutation, deleteVaccinationMutation } =
    useVaccinations();

  const params = useLocalSearchParams<{
    id: string;
    vaccinationId?: string;
    category?: string;
  }>();
  const rawVid = params.vaccinationId;
  const vaccinationId = Array.isArray(rawVid) ? rawVid[0] : rawVid;
  const category = parseCategory(params.category);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDoc, setShowDoc] = useState(false);

  const vaccination = useMemo(
    () => vaccinations.find((v) => v.id === vaccinationId),
    [vaccinations, vaccinationId]
  );

  const hasDocument = !!vaccination?.document_url;
  const dueBadge = vaccination
    ? getVaccineDueBadge(vaccination.next_due_date, category)
    : null;
  const badgeColors = dueBadge ? BADGE_STYLES[dueBadge.variant] : null;

  const screenBg = healthDetailScreenBg(theme, isDark);
  const dChrome = healthDetailCardChrome(theme, isDark);
  const hChrome = healthDetailHeaderChrome(theme, isDark);

  const handleShare = () => {
    if (!vaccination) return;
    const title = vaccination.name;
    const body = [
      `Administered: ${formatDateLong(vaccination.date)}`,
      vaccination.next_due_date
        ? `Next due: ${formatDateLong(vaccination.next_due_date)}`
        : null,
      vaccination.clinic_name ? `Clinic: ${vaccination.clinic_name}` : null,
      vaccination.notes ? `Notes: ${vaccination.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (vaccination.document_url) {
      void shareStorageDocument(
        vaccination.document_url,
        `${vaccination.name.replace(/\s+/g, "_")}_vaccination`
      );
    } else {
      void shareTextSummary(title, body);
    }
  };

  const handleDownload = () => {
    if (!vaccination?.document_url) {
      Alert.alert("Download", "No document is attached to this record.");
      return;
    }
    void shareStorageDocument(
      vaccination.document_url,
      `${vaccination.name.replace(/\s+/g, "_")}_vaccination`
    );
  };

  const handleDelete = () => {
    if (!vaccination) return;
    Alert.alert(
      "Delete Vaccination",
      "Are you sure you want to delete this vaccination record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteVaccinationMutation.mutate(vaccination.id, {
              onSuccess: () => router.back(),
              onError: () =>
                Alert.alert("Error", "Failed to delete vaccination"),
            });
          },
        },
      ]
    );
  };

  const handleSaveEdit = (id: string, data: TablesUpdate<"vaccinations">) => {
    updateVaccinationMutation.mutate(
      { id, data },
      {
        onSuccess: () => setShowEdit(false),
        onError: () => Alert.alert("Error", "Failed to update vaccination"),
      }
    );
  };

  const menuActions: OverflowAction[] = [
    { label: "Edit", onPress: () => setShowEdit(true) },
    { label: "Share", onPress: handleShare },
    { label: "Download", onPress: handleDownload },
    { label: "Delete", onPress: handleDelete, destructive: true },
  ];

  if (!vaccinationId) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: screenBg, paddingTop: insets.top }}
      >
        <Text style={{ color: theme.secondary }}>Missing vaccination id.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text style={{ color: theme.primary, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!vaccination) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: screenBg, paddingTop: insets.top }}
      >
        <ActivityIndicator color={theme.primary} />
        <Text className="mt-3" style={{ color: theme.secondary }}>
          Loading…
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: screenBg }}>
      <View
        style={{
          paddingTop: insets.top + HEALTH_LAYOUT.headerTopPad,
          paddingHorizontal: HEALTH_LAYOUT.screenPaddingX,
          paddingBottom: HEALTH_LAYOUT.headerBottomPad,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={[
            styles.headerCircle,
            {
              backgroundColor: hChrome.headerBtnBg,
              borderWidth: hChrome.headerBtnBorderWidth,
              borderColor: hChrome.headerBtnBorder,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={theme.foreground} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            ...HEALTH_TYPE.navTitle,
            color: theme.foreground,
            marginHorizontal: 8,
          }}
          numberOfLines={1}
        >
          {vaccination.name}
        </Text>
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          hitSlop={12}
          style={[
            styles.headerCircle,
            {
              backgroundColor: hChrome.headerBtnBg,
              borderWidth: hChrome.headerBtnBorderWidth,
              borderColor: hChrome.headerBtnBorder,
            },
          ]}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: HEALTH_LAYOUT.screenPaddingX,
          paddingBottom: insets.bottom + HEALTH_LAYOUT.screenPaddingBottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View
          style={[
            styles.card,
            { backgroundColor: dChrome.cardBg },
            dChrome.outline,
            dChrome.shadow,
          ]}
        >
          <View style={styles.summaryRow}>
            <View style={[styles.iconCircle, { backgroundColor: FIGMA_HEALTH_TEAL }]}>
              <MaterialCommunityIcons name="heart-pulse" size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              <Text
                style={[HEALTH_TYPE.detailTitle, { color: theme.foreground }]}
                numberOfLines={2}
              >
                {vaccination.name}
              </Text>
              <Text
                style={[
                  HEALTH_TYPE.detailSubtitle,
                  { color: theme.secondary, marginTop: 4 },
                ]}
              >
                {categorySubtitle(category)}
              </Text>
            </View>
            {dueBadge && badgeColors ? (
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: badgeColors.bg },
                ]}
              >
                <Text style={[HEALTH_TYPE.badge, { color: badgeColors.text }]}>
                  {dueBadge.label}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Clinic information */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: dChrome.cardBg,
              marginTop: HEALTH_LAYOUT.detailSectionGap,
            },
            dChrome.outline,
            dChrome.shadow,
          ]}
        >
          <Text
            style={[
              HEALTH_TYPE.cardSection,
              { color: theme.secondary, marginBottom: HEALTH_LAYOUT.fieldStackGap },
            ]}
          >
            Clinic Information
          </Text>
          <DetailRow
            icon="person-outline"
            label="Veterinarian"
            value="—"
            theme={theme}
            iconPlate={dChrome.iconPlate}
            iconColor={dChrome.iconInk}
          />
          <View style={{ height: HEALTH_LAYOUT.fieldStackGap }} />
          <DetailRow
            icon="business-outline"
            label="Clinic"
            value={vaccination.clinic_name || "—"}
            theme={theme}
            iconPlate={dChrome.iconPlate}
            iconColor={dChrome.iconInk}
          />
        </View>

        {/* Timeline */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: dChrome.cardBg,
              marginTop: HEALTH_LAYOUT.detailSectionGap,
            },
            dChrome.outline,
            dChrome.shadow,
          ]}
        >
          <Text
            style={[
              HEALTH_TYPE.cardSection,
              { color: theme.secondary, marginBottom: HEALTH_LAYOUT.fieldStackGap },
            ]}
          >
            Timeline
          </Text>
          <DetailRow
            icon="calendar-outline"
            label="Administered"
            value={formatDateLong(vaccination.date)}
            theme={theme}
            iconPlate={dChrome.iconPlate}
            iconColor={dChrome.iconInk}
          />
          <View style={{ height: HEALTH_LAYOUT.fieldStackGap }} />
          <DetailRow
            icon="time-outline"
            label="Next Due Date"
            value={
              vaccination.next_due_date
                ? formatDateLong(vaccination.next_due_date)
                : "—"
            }
            theme={theme}
            iconPlate={dChrome.iconPlate}
            iconColor={dChrome.iconInk}
          />
        </View>

        {/* Notes */}
        {vaccination.notes ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: dChrome.cardBg,
                marginTop: HEALTH_LAYOUT.detailSectionGap,
              },
              dChrome.outline,
              dChrome.shadow,
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: HEALTH_LAYOUT.notesTitleGap,
              }}
            >
              <Ionicons name="document-text-outline" size={18} color={theme.secondary} />
              <Text
                style={[
                  HEALTH_TYPE.cardSection,
                  { color: theme.foreground, marginLeft: 8 },
                ]}
              >
                Notes
              </Text>
            </View>
            <View
              style={{
                backgroundColor: dChrome.notesBubbleBg,
                borderRadius: HEALTH_LAYOUT.notesRadius,
                padding: HEALTH_LAYOUT.notesPadding,
              }}
            >
              <Text style={[HEALTH_TYPE.notesBody, { color: theme.foreground }]}>
                {vaccination.notes}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Document */}
        {hasDocument ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowDoc(true)}
            style={[
              styles.card,
              {
                backgroundColor: dChrome.cardBg,
                marginTop: HEALTH_LAYOUT.detailSectionGap,
              },
              dChrome.outline,
              dChrome.shadow,
            ]}
          >
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: dChrome.iconPlate,
                    marginBottom: HEALTH_LAYOUT.cardGap,
                  },
                ]}
              >
                <Ionicons name="image-outline" size={28} color={dChrome.iconInk} />
              </View>
              <Text
                style={[
                  HEALTH_TYPE.documentTitle,
                  { color: theme.foreground, textAlign: "center" },
                ]}
                numberOfLines={2}
              >
                {documentFileLabel(vaccination.document_url)}
              </Text>
              <Text
                style={[
                  HEALTH_TYPE.documentHint,
                  { color: theme.secondary, marginTop: 8 },
                ]}
              >
                Tap to open document
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <RecordOverflowSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={menuActions}
      />

      <VaccinationEditModal
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={handleSaveEdit}
        vaccination={vaccination}
        loading={updateVaccinationMutation.isPending}
      />

      <DocumentViewerModal
        visible={showDoc}
        onClose={() => setShowDoc(false)}
        documentPath={vaccination.document_url}
        title="Vaccination Document"
      />
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  theme,
  iconPlate,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  theme: { foreground: string; secondary: string };
  iconPlate: string;
  iconColor: string;
}) {
  const ri = HEALTH_LAYOUT.detailRowIcon;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      <View
        style={{
          width: ri.size,
          height: ri.size,
          borderRadius: ri.radius,
          backgroundColor: iconPlate,
          alignItems: "center",
          justifyContent: "center",
          marginRight: ri.marginRight,
        }}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[HEALTH_TYPE.detailFieldLabel, { color: theme.secondary }]}>{label}</Text>
        <Text
          style={[
            HEALTH_TYPE.detailFieldValue,
            { color: theme.foreground, marginTop: 2 },
          ]}
          numberOfLines={3}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCircle: {
    width: HEALTH_LAYOUT.headerCircle.size,
    height: HEALTH_LAYOUT.headerCircle.size,
    borderRadius: HEALTH_LAYOUT.headerCircle.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: HEALTH_LAYOUT.detailCardRadius,
    padding: HEALTH_LAYOUT.detailCardPadding,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconCircle: {
    width: HEALTH_LAYOUT.iconPlateDetail.size,
    height: HEALTH_LAYOUT.iconPlateDetail.size,
    borderRadius: HEALTH_LAYOUT.iconPlateDetail.radius,
    alignItems: "center",
    justifyContent: "center",
    marginRight: HEALTH_LAYOUT.detailSummaryIconGap,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
});
