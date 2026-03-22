import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import {
  OverflowAction,
  RecordOverflowSheet,
} from "@/components/health/RecordOverflowSheet";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { useVaccinations } from "@/context/vaccinationsContext";
import { Tables, TablesUpdate } from "@/database.types";
import {
  FIGMA_HEALTH_TEAL,
  HEALTH_LAYOUT,
  HEALTH_TYPE,
  healthListCardChrome,
} from "@/constants/figmaHealthLayout";
import { VaccineCategory } from "@/services/vaccineRequirements";
import { formatDateMedium } from "@/utils/dates";
import { shareStorageDocument, shareTextSummary } from "@/utils/documentShare";
import { getVaccineDueBadge } from "@/utils/vaccinationUi";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { VaccinationEditModal } from "./VaccinationEditModal";

interface VaccinationCardProps {
  vaccination: Tables<"vaccinations">;
  category: VaccineCategory;
}

const BADGE_STYLES_LIGHT: Record<
  "overdue" | "dueGreen" | "dueOrange",
  { bg: string; text: string }
> = {
  overdue: { bg: "rgba(239, 68, 68, 0.12)", text: "#DC2626" },
  dueGreen: { bg: "rgba(34, 197, 94, 0.12)", text: "#15803D" },
  dueOrange: { bg: "rgba(251, 146, 60, 0.16)", text: "#C2410C" },
};

/** Figma dark cards (1340:33857): higher-contrast pills on #1C2128 */
const BADGE_STYLES_DARK: Record<
  "overdue" | "dueGreen" | "dueOrange",
  { bg: string; text: string }
> = {
  overdue: { bg: "rgba(239, 68, 68, 0.22)", text: "#FCA5A5" },
  dueGreen: { bg: "rgba(22, 163, 74, 0.35)", text: "#86EFAC" },
  dueOrange: { bg: "rgba(251, 146, 60, 0.28)", text: "#FDBA74" },
};

export const VaccinationCard: React.FC<VaccinationCardProps> = ({
  vaccination,
  category,
}) => {
  const { pet } = useSelectedPet();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { updateVaccinationMutation, deleteVaccinationMutation } =
    useVaccinations();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const hasDocument = !!vaccination.document_url;
  const dueBadge = getVaccineDueBadge(vaccination.next_due_date, category);

  const chrome = healthListCardChrome(theme, isDark);
  const { cardBg, overflowBtnBg, divider } = chrome;

  const openDetail = () => {
    if (!pet) return;
    router.push(
      `/(home)/health-record/${pet.id}/vaccination-detail?vaccinationId=${vaccination.id}&category=${category}` as any
    );
  };

  const handleDelete = () => {
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
              onSuccess: () =>
                Alert.alert("Success", "Vaccination deleted successfully"),
              onError: () => Alert.alert("Error", "Failed to delete vaccination"),
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
        onSuccess: () => {
          setShowEditModal(false);
          Alert.alert("Success", "Vaccination updated successfully");
        },
        onError: () => Alert.alert("Error", "Failed to update vaccination"),
      }
    );
  };

  const handleShare = () => {
    const title = vaccination.name;
    const body = [
      `Administered: ${formatDateMedium(vaccination.date)}`,
      vaccination.next_due_date
        ? `Next due: ${formatDateMedium(vaccination.next_due_date)}`
        : null,
      vaccination.clinic_name ? `Clinic: ${vaccination.clinic_name}` : null,
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

  const menuActions: OverflowAction[] = [
    { label: "Edit", onPress: () => setShowEditModal(true) },
    { label: "Share", onPress: handleShare },
    ...(hasDocument
      ? ([
          {
            label: "View Document",
            onPress: () => setShowDocumentModal(true),
          },
        ] as OverflowAction[])
      : []),
    { label: "Delete", onPress: handleDelete, destructive: true },
  ];

  const badgePalette = isDark ? BADGE_STYLES_DARK : BADGE_STYLES_LIGHT;
  const badgeColors = dueBadge ? badgePalette[dueBadge.variant] : null;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={openDetail}
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderWidth: chrome.borderWidth,
            borderColor: chrome.borderColor,
          },
        ]}
      >
        {/* Top row: icon, title + badge, overflow */}
        <View style={styles.topRow}>
          <View style={[styles.iconCircle, { backgroundColor: FIGMA_HEALTH_TEAL }]}>
            <MaterialCommunityIcons name="heart-pulse" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.titleBlock}>
            <Text
              style={[styles.vaccineName, HEALTH_TYPE.cardTitle, { color: theme.foreground }]}
              numberOfLines={2}
            >
              {vaccination.name}
            </Text>
            {dueBadge && badgeColors && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: badgeColors.bg },
                ]}
              >
                <Text style={[styles.badgeText, HEALTH_TYPE.badge, { color: badgeColors.text }]}>
                  {dueBadge.label}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.overflowBtn, { backgroundColor: overflowBtnBg }]}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={theme.foreground} />
          </TouchableOpacity>
        </View>

        {/* Administered | Next due columns */}
        <View style={styles.columns}>
          <View style={[styles.column, styles.columnLeft]}>
            <View style={styles.columnIconWrap}>
              <Ionicons name="calendar-outline" size={16} color={theme.secondary} />
            </View>
            <Text style={[styles.colLabel, HEALTH_TYPE.fieldLabel, { color: theme.secondary }]}>
              Administered
            </Text>
            <Text style={[styles.colValue, HEALTH_TYPE.fieldValue, { color: theme.foreground }]}>
              {formatDateMedium(vaccination.date)}
            </Text>
          </View>
          <View style={styles.column}>
            <View style={styles.columnIconWrap}>
              <Ionicons name="time-outline" size={16} color={theme.secondary} />
            </View>
            <Text style={[styles.colLabel, HEALTH_TYPE.fieldLabel, { color: theme.secondary }]}>
              Next Due
            </Text>
            <Text style={[styles.colValue, HEALTH_TYPE.fieldValue, { color: theme.foreground }]}>
              {vaccination.next_due_date
                ? formatDateMedium(vaccination.next_due_date)
                : "—"}
            </Text>
          </View>
        </View>

        {vaccination.clinic_name ? (
          <View
            style={[
              styles.clinicRow,
              { borderTopColor: divider },
            ]}
          >
            <View style={[styles.columnIconWrap, { marginRight: 8 }]}>
              <Ionicons name="business-outline" size={16} color={theme.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.colLabel, HEALTH_TYPE.fieldLabel, { color: theme.secondary }]}>
                Clinic
              </Text>
              <Text
                style={[styles.colValue, HEALTH_TYPE.fieldValue, { color: theme.foreground }]}
                numberOfLines={2}
              >
                {vaccination.clinic_name}
              </Text>
            </View>
          </View>
        ) : null}
      </TouchableOpacity>

      <RecordOverflowSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={menuActions}
      />

      <VaccinationEditModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
        vaccination={vaccination}
        loading={updateVaccinationMutation.isPending}
      />

      <DocumentViewerModal
        visible={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        documentPath={vaccination.document_url}
        title="Vaccination Document"
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: HEALTH_LAYOUT.cardRadius,
    padding: HEALTH_LAYOUT.cardPadding,
    marginBottom: HEALTH_LAYOUT.cardGap,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconCircle: {
    width: HEALTH_LAYOUT.iconPlate.size,
    height: HEALTH_LAYOUT.iconPlate.size,
    borderRadius: HEALTH_LAYOUT.iconPlate.radius,
    alignItems: "center",
    justifyContent: "center",
    marginRight: HEALTH_LAYOUT.iconToTitleGap,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: HEALTH_LAYOUT.titleBlockEndPadding,
  },
  vaccineName: {
    marginBottom: HEALTH_LAYOUT.titleToBadgeGap,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeText: {},
  overflowBtn: {
    width: HEALTH_LAYOUT.overflow.size,
    height: HEALTH_LAYOUT.overflow.size,
    borderRadius: HEALTH_LAYOUT.overflow.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  columns: {
    flexDirection: "row",
    marginTop: HEALTH_LAYOUT.columnsMarginTop,
  },
  column: {
    flex: 1,
  },
  columnLeft: {
    marginRight: 10,
  },
  columnIconWrap: {
    marginBottom: 4,
  },
  colLabel: {
    marginBottom: 2,
  },
  colValue: {},
  clinicRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: HEALTH_LAYOUT.clinicFooterMarginTop,
    paddingTop: HEALTH_LAYOUT.clinicFooterPaddingTop,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
