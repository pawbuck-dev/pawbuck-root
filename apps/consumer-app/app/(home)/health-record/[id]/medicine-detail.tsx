import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import {
  OverflowAction,
  RecordOverflowSheet,
} from "@/components/health/RecordOverflowSheet";
import { MedicineEditModal } from "@/components/medicines/MedicineEditModal";
import {
  FIGMA_HEALTH_MEDS_ICON_BG,
  HEALTH_LAYOUT,
  HEALTH_TYPE,
  healthDetailCardChrome,
  healthDetailHeaderChrome,
  healthDetailScreenBg,
} from "@/constants/figmaHealthLayout";
import { useTheme } from "@/context/themeContext";
import { useMedicines } from "@/context/medicinesContext";
import { MedicineData } from "@/models/medication";
import { formatDateLong, formatDateMedium } from "@/utils/dates";
import { getNextMedicationDose } from "@/utils/medication";
import { shareStorageDocument, shareTextSummary } from "@/utils/documentShare";
import {
  getMedicineListStatus,
  medicineStatusBadgeStyle,
  medicineStatusSubtitle,
  MedicineListStatus,
} from "@/utils/medicineUi";
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

function parseListStatus(raw: string | string[] | undefined): MedicineListStatus {
  const c = Array.isArray(raw) ? raw[0] : raw;
  return c === "completed" ? "completed" : "active";
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

export default function MedicineDetailScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const insets = useSafeAreaInsets();
  const { medicines, deleteMedicineMutation } = useMedicines();

  const params = useLocalSearchParams<{
    id: string;
    medicineId?: string;
    listStatus?: string;
  }>();
  const rawMid = params.medicineId;
  const medicineId = Array.isArray(rawMid) ? rawMid[0] : rawMid;
  const listStatusParam = parseListStatus(params.listStatus);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDoc, setShowDoc] = useState(false);

  const medicine = useMemo(
    () => medicines.find((m) => m.id === medicineId),
    [medicines, medicineId]
  );

  const derivedStatus = medicine ? getMedicineListStatus(medicine) : listStatusParam;
  const statusPill = medicineStatusBadgeStyle(derivedStatus, isDark);
  const hasDocument = !!medicine?.document_url;

  const nextDose = useMemo(() => {
    if (!medicine || derivedStatus === "completed") return null;
    return getNextMedicationDose(medicine);
  }, [medicine, derivedStatus]);

  const screenBg = healthDetailScreenBg(theme, isDark);

  const handleShare = () => {
    if (!medicine) return;
    const title = medicine.name;
    const body = [
      `Dosage: ${medicine.dosage}`,
      `Frequency: ${medicine.frequency}`,
      medicine.purpose ? `Purpose: ${medicine.purpose}` : null,
      medicine.start_date ? `Started: ${formatDateLong(medicine.start_date)}` : null,
      medicine.end_date ? `Ended: ${formatDateLong(medicine.end_date)}` : null,
      medicine.prescribed_by ? `Prescribed by: ${medicine.prescribed_by}` : null,
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

  const handleDownload = () => {
    if (!medicine?.document_url) {
      Alert.alert("Download", "No document is attached to this record.");
      return;
    }
    void shareStorageDocument(
      medicine.document_url,
      `${medicine.name.replace(/\s+/g, "_")}_prescription`
    );
  };

  const handleDelete = () => {
    if (!medicine?.id) return;
    Alert.alert(
      "Delete Medicine",
      "Are you sure you want to delete this medicine record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMedicineMutation.mutate(medicine.id, {
              onSuccess: () => router.back(),
              onError: () => Alert.alert("Error", "Failed to delete medicine"),
            });
          },
        },
      ]
    );
  };

  const menuActions: OverflowAction[] = [
    { label: "Edit", onPress: () => setShowEdit(true) },
    { label: "Share", onPress: handleShare },
    { label: "Download", onPress: handleDownload },
    { label: "Delete", onPress: handleDelete, destructive: true },
  ];

  if (!medicineId) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: screenBg, paddingTop: insets.top }}
      >
        <Text style={{ color: theme.secondary }}>Missing medicine id.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text style={{ color: theme.primary, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!medicine) {
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

  const dChrome = healthDetailCardChrome(theme, isDark);
  const hChrome = healthDetailHeaderChrome(theme, isDark);

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
          {medicine.name}
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
        <View
          style={[
            styles.card,
            { backgroundColor: dChrome.cardBg },
            dChrome.outline,
            dChrome.shadow,
          ]}
        >
          <View style={styles.summaryRow}>
            <View style={[styles.iconCircle, { backgroundColor: FIGMA_HEALTH_MEDS_ICON_BG }]}>
              <MaterialCommunityIcons name="pill" size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              <Text
                style={[HEALTH_TYPE.detailTitle, { color: theme.foreground }]}
                numberOfLines={2}
              >
                {medicine.name}
              </Text>
              <Text
                style={[
                  HEALTH_TYPE.detailSubtitle,
                  { color: theme.secondary, marginTop: 4 },
                ]}
              >
                {medicineStatusSubtitle(derivedStatus)}
              </Text>
              <View
                style={[
                  styles.typePill,
                  {
                    backgroundColor: isDark ? "rgba(37, 99, 235, 0.22)" : "rgba(37, 99, 235, 0.12)",
                    alignSelf: "flex-start",
                    marginTop: 8,
                  },
                ]}
              >
                <Text style={[HEALTH_TYPE.badge, { color: isDark ? "#93C5FD" : "#2563EB" }]}>
                  {medicine.type}
                </Text>
              </View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusPill.bg }]}>
              <Text style={[HEALTH_TYPE.badge, { color: statusPill.text }]}>{statusPill.label}</Text>
            </View>
          </View>
        </View>

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
            Prescription details
          </Text>
          <DetailRow
            icon="medical-outline"
            label="Dosage"
            value={medicine.dosage}
            theme={theme}
            iconPlate={dChrome.iconPlate}
            iconColor={dChrome.iconInk}
          />
          <View style={{ height: HEALTH_LAYOUT.fieldStackGap }} />
          <DetailRow
            icon="time-outline"
            label="Frequency"
            value={medicine.frequency}
            theme={theme}
            iconPlate={dChrome.iconPlate}
            iconColor={dChrome.iconInk}
          />
          {medicine.purpose ? (
            <>
              <View style={{ height: HEALTH_LAYOUT.fieldStackGap }} />
              <DetailRow
                icon="information-circle-outline"
                label="Purpose"
                value={medicine.purpose}
                theme={theme}
                iconPlate={dChrome.iconPlate}
                iconColor={dChrome.iconInk}
              />
            </>
          ) : null}
        </View>

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
          {medicine.start_date ? (
            <DetailRow
              icon="calendar-outline"
              label="Started"
              value={formatDateLong(medicine.start_date)}
              theme={theme}
              iconPlate={dChrome.iconPlate}
              iconColor={dChrome.iconInk}
            />
          ) : null}
          {medicine.end_date ? (
            <>
              <View style={{ height: HEALTH_LAYOUT.fieldStackGap }} />
              <DetailRow
                icon="calendar-outline"
                label="End date"
                value={formatDateLong(medicine.end_date)}
                theme={theme}
                iconPlate={dChrome.iconPlate}
                iconColor={dChrome.iconInk}
              />
            </>
          ) : null}
          {nextDose ? (
            <>
              <View style={{ height: HEALTH_LAYOUT.fieldStackGap }} />
              <DetailRow
                icon="alarm-outline"
                label="Next dose"
                value={formatDateMedium(nextDose.toISOString())}
                theme={theme}
                iconPlate={dChrome.iconPlate}
                iconColor={dChrome.iconInk}
              />
            </>
          ) : null}
        </View>

        {medicine.prescribed_by ? (
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
              Provider
            </Text>
            <DetailRow
              icon="person-outline"
              label="Prescribed by"
              value={medicine.prescribed_by}
              theme={theme}
              iconPlate={dChrome.iconPlate}
              iconColor={dChrome.iconInk}
            />
          </View>
        ) : null}

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
                {documentFileLabel(medicine.document_url)}
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

      <MedicineEditModal
        visible={showEdit}
        medicine={medicine as MedicineData}
        onClose={() => setShowEdit(false)}
        onSave={() => setShowEdit(false)}
      />

      <DocumentViewerModal
        visible={showDoc}
        onClose={() => setShowDoc(false)}
        documentPath={medicine.document_url || null}
        title="Prescription Document"
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
          numberOfLines={4}
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
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
});
