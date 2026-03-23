import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import {
  OverflowAction,
  RecordOverflowSheet,
} from "@/components/health/RecordOverflowSheet";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { useMedicines } from "@/context/medicinesContext";
import {
  FIGMA_HEALTH_MEDS_ICON_BG,
  HEALTH_LAYOUT,
  HEALTH_TYPE,
  healthListCardChrome,
} from "@/constants/figmaHealthLayout";
import { MedicineData } from "@/types/medication";
import { formatDateMedium } from "@/utils/dates";
import { getNextMedicationDose } from "@/utils/medication";
import { shareStorageDocument, shareTextSummary } from "@/utils/documentShare";
import {
  getMedicineListStatus,
  medicineStatusBadgeStyle,
  MedicineListStatus,
} from "@/utils/medicineUi";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MedicineEditModal } from "./MedicineEditModal";

interface MedicineCardProps {
  medicine: MedicineData;
  /** Section this row appears under (for navigation + badge consistency) */
  listStatus: MedicineListStatus;
}

export const MedicineCard: React.FC<MedicineCardProps> = ({
  medicine,
  listStatus,
}) => {
  const { pet } = useSelectedPet();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { deleteMedicineMutation } = useMedicines();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const hasDocument = !!medicine.document_url;
  const derived = getMedicineListStatus(medicine);
  const badge = medicineStatusBadgeStyle(derived, isDark);

  const nextDose = useMemo(() => {
    if (derived === "completed") return null;
    return getNextMedicationDose(medicine);
  }, [medicine, derived]);

  const chrome = healthListCardChrome(theme, isDark);
  const { cardBg, overflowBtnBg, divider } = chrome;

  const openDetail = () => {
    if (!pet) return;
    router.push(
      `/(home)/health-record/${pet.id}/medicine-detail?medicineId=${medicine.id}&listStatus=${listStatus}` as any
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Medicine",
      "Are you sure you want to delete this medicine record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMedicineMutation.mutate(medicine.id || "", {
              onSuccess: () => Alert.alert("Success", "Medicine deleted successfully"),
              onError: () => Alert.alert("Error", "Failed to delete medicine"),
            });
          },
        },
      ]
    );
  };

  const handleShare = () => {
    const title = medicine.name;
    const body = [
      `Dosage: ${medicine.dosage}`,
      `Frequency: ${medicine.frequency}`,
      medicine.purpose ? `Purpose: ${medicine.purpose}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (medicine.document_url) {
      void shareStorageDocument(
        medicine.document_url,
        `${medicine.name.replace(/\s+/g, "_")}_prescription`
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
          { label: "View Document", onPress: () => setShowDocumentModal(true) },
        ] as OverflowAction[])
      : []),
    { label: "Delete", onPress: handleDelete, destructive: true },
  ];

  const formatStartEnd = () => {
    if (!medicine.start_date) return null;
    const start = formatDateMedium(medicine.start_date);
    if (medicine.end_date) {
      return `${start} – ${formatDateMedium(medicine.end_date)}`;
    }
    return start;
  };

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
        <View style={styles.topRow}>
          <View style={[styles.iconCircle, { backgroundColor: FIGMA_HEALTH_MEDS_ICON_BG }]}>
            <MaterialCommunityIcons name="pill" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.titleBlock}>
            <Text
              style={[styles.medName, HEALTH_TYPE.cardTitle, { color: theme.foreground }]}
              numberOfLines={2}
            >
              {medicine.name}
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                marginTop: HEALTH_LAYOUT.titleToBadgeGap,
              }}
            >
              <View style={[styles.badge, { backgroundColor: badge.bg, marginRight: 6 }]}>
                <Text style={[styles.badgeText, HEALTH_TYPE.badge, { color: badge.text }]}>
                  {badge.label}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(37, 99, 235, 0.1)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    HEALTH_TYPE.badge,
                    { color: isDark ? "#93C5FD" : "#2563EB" },
                  ]}
                >
                  {medicine.type}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.overflowBtn, { backgroundColor: overflowBtnBg }]}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={theme.foreground} />
          </TouchableOpacity>
        </View>

        {medicine.purpose ? (
          <Text
            style={{
              ...HEALTH_TYPE.purposeItalic,
              color: theme.secondary,
              marginTop: 10,
            }}
            numberOfLines={2}
          >
            {medicine.purpose}
          </Text>
        ) : null}

        <View style={styles.columns}>
          <View style={[styles.column, { marginRight: 10 }]}>
            <View style={styles.columnIconWrap}>
              <Ionicons name="medical-outline" size={16} color={theme.secondary} />
            </View>
            <Text style={[styles.colLabel, HEALTH_TYPE.fieldLabel, { color: theme.secondary }]}>
              Dosage
            </Text>
            <Text
              style={[styles.colValue, HEALTH_TYPE.fieldValue, { color: theme.foreground }]}
              numberOfLines={2}
            >
              {medicine.dosage}
            </Text>
          </View>
          <View style={styles.column}>
            <View style={styles.columnIconWrap}>
              <Ionicons name="time-outline" size={16} color={theme.secondary} />
            </View>
            <Text style={[styles.colLabel, HEALTH_TYPE.fieldLabel, { color: theme.secondary }]}>
              Frequency
            </Text>
            <Text
              style={[styles.colValue, HEALTH_TYPE.fieldValue, { color: theme.foreground }]}
              numberOfLines={2}
            >
              {medicine.frequency}
            </Text>
          </View>
        </View>

        {nextDose ? (
          <View style={{ marginTop: 14 }}>
            <View style={styles.columnIconWrap}>
              <Ionicons name="alarm-outline" size={16} color={theme.primary} />
            </View>
            <Text style={[styles.colLabel, HEALTH_TYPE.fieldLabel, { color: theme.secondary }]}>
              Next dose
            </Text>
            <Text style={[styles.colValue, HEALTH_TYPE.fieldValue, { color: theme.primary }]}>
              {formatDateMedium(nextDose.toISOString())}
            </Text>
          </View>
        ) : null}

        {formatStartEnd() ? (
          <View
            style={[
              styles.footerRow,
              { borderTopColor: divider },
            ]}
          >
            <View style={[styles.columnIconWrap, { marginRight: 8 }]}>
              <Ionicons name="calendar-outline" size={16} color={theme.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.colLabel, HEALTH_TYPE.fieldLabel, { color: theme.secondary }]}>
                Started
              </Text>
              <Text
                style={[styles.colValue, HEALTH_TYPE.fieldValue, { color: theme.foreground }]}
                numberOfLines={2}
              >
                {formatStartEnd()}
              </Text>
            </View>
          </View>
        ) : null}

        {medicine.prescribed_by ? (
          <View
            style={[
              styles.footerRow,
              {
                borderTopColor: divider,
                marginTop: formatStartEnd() ? 0 : HEALTH_LAYOUT.clinicFooterMarginTop,
              },
            ]}
          >
            <View style={[styles.columnIconWrap, { marginRight: 8 }]}>
              <Ionicons name="person-outline" size={16} color={theme.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.colLabel, HEALTH_TYPE.fieldLabel, { color: theme.secondary }]}>
                Prescribed by
              </Text>
              <Text
                style={[styles.colValue, HEALTH_TYPE.fieldValue, { color: theme.foreground }]}
                numberOfLines={2}
              >
                {medicine.prescribed_by}
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

      <MedicineEditModal
        visible={showEditModal}
        medicine={medicine}
        onClose={() => setShowEditModal(false)}
        onSave={() => setShowEditModal(false)}
      />

      <DocumentViewerModal
        visible={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        documentPath={medicine.document_url || null}
        title="Prescription Document"
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
  medName: {},
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: "flex-start",
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
  columnIconWrap: {
    marginBottom: 4,
  },
  colLabel: {
    marginBottom: 2,
  },
  colValue: {},
  footerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: HEALTH_LAYOUT.clinicFooterMarginTop,
    paddingTop: HEALTH_LAYOUT.clinicFooterPaddingTop,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
