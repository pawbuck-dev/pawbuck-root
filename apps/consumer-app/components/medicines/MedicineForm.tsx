import {
  FIGMA_MINT_SCREEN_LIGHT,
  HEALTH_LAYOUT,
  healthDetailHeaderChrome,
} from "@/constants/figmaHealthLayout";
import {
  MEDICATION_TYPES,
  MEDICATION_TYPES_PICKER_ORDER,
  medicationTypeLabel,
} from "@/constants/medicines";
import {
  FREQUENCY_PICKER_ORDER,
  frequencyMenuLabel,
  ScheduleFrequency,
} from "@/constants/schedules";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { MedicationSchedule, MedicineFormData } from "@/types/medication";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import moment from "moment";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "../common/DateTimePicker";
import {
  MedicineDropdownRow,
  MedicineInlineDropdownPanel,
} from "./MedicineDropdownModal";
import ScheduleInput from "./ScheduleInput";

const INPUT_RADIUS = 14;
const FIELD_LABEL_FS = 15;

/** Footer CTAs — dark mode ref screenshot / Figma seafoam pill */
const CTA_SAVE_TEAL_TOP = "#6BC9C4";
const CTA_SAVE_TEAL_BOTTOM = "#4A9E98";
const CTA_CANCEL_DARK_TOP = "rgba(255,255,255,0.14)";
const CTA_CANCEL_DARK_BOTTOM = "rgba(255,255,255,0.06)";
const CTA_CANCEL_DARK_BORDER = "rgba(255,255,255,0.22)";
const CTA_LABEL_ON_TEAL = "#FFFFFF";

const CTA_CANCEL_LIGHT_TOP = "#F2F4F5";
const CTA_CANCEL_LIGHT_BOTTOM = "#E4E8EA";
const CTA_CANCEL_LIGHT_BORDER = "rgba(0,0,0,0.12)";
const CTA_SAVE_LIGHT_TOP = "#3EBDB2";
const CTA_SAVE_LIGHT_BOTTOM = "#258A82";

/** Footer CTAs — match NewMessageModal footer (paddingVertical 16, radius 28, gap 12, 16/600) */
const CTA_RADIUS = 28;
const CTA_PADDING_V = 16;
const CTA_PADDING_H = 16;
const CTA_ROW_GAP = 12;
const CTA_FONT_SIZE = 16;

/** Figma 1386:44525 — empty frequency uses “Select one…” until user picks. */
const EMPTY_FREQUENCY = "" as unknown as ScheduleFrequency;

function isScheduleFrequency(
  v: string | ScheduleFrequency | null | undefined
): v is ScheduleFrequency {
  return (
    v != null &&
    String(v).length > 0 &&
    (Object.values(ScheduleFrequency) as string[]).includes(String(v))
  );
}

function formatMedicineFormDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  return moment(date).format("DD/MM/YYYY");
}

interface MedicineFormProps {
  isProcessing: boolean;
  onSave: (data: MedicineFormData) => void;
  initialData?: MedicineFormData;
  onClose: () => void;
  loading: boolean;
  actionTitle: "Edit" | "Add";
}

const MedicineForm = ({
  isProcessing,
  initialData,
  onSave,
  onClose,
  loading,
  actionTitle,
}: MedicineFormProps) => {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const insets = useSafeAreaInsets();
  const { pet } = useSelectedPet();
  const hChrome = healthDetailHeaderChrome(theme, isDark);

  const screenBg = isDark ? theme.background : FIGMA_MINT_SCREEN_LIGHT;
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6";

  const cancelGradientColors: [string, string] = isDark
    ? [CTA_CANCEL_DARK_TOP, CTA_CANCEL_DARK_BOTTOM]
    : [CTA_CANCEL_LIGHT_TOP, CTA_CANCEL_LIGHT_BOTTOM];
  const cancelBorderColor = isDark ? CTA_CANCEL_DARK_BORDER : CTA_CANCEL_LIGHT_BORDER;
  const saveGradientColors: [string, string] = isDark
    ? [CTA_SAVE_TEAL_TOP, CTA_SAVE_TEAL_BOTTOM]
    : [CTA_SAVE_LIGHT_TOP, CTA_SAVE_LIGHT_BOTTOM];
  const cancelLabelColor = isDark ? CTA_LABEL_ON_TEAL : theme.foreground;
  const saveLabelColor = CTA_LABEL_ON_TEAL;
  const fieldChevronColor = isDark ? "#FFFFFF" : theme.secondary;

  const titleText = `${actionTitle} Medicine`;

  const [data, setData] = useState<MedicineFormData>(() => {
    if (initialData) {
      return { ...initialData };
    }
    return {
      pet_id: pet?.id || "",
      name: "",
      start_date: new Date().toISOString(),
      end_date: null,
      document_url: null,
      dosage: "",
      prescribed_by: null,
      purpose: null,
      type: "",
      frequency: EMPTY_FREQUENCY,
      schedules: [],
    };
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingDateType, setEditingDateType] = useState<
    "startDate" | "endDate" | null
  >(null);
  const [editingDate, setEditingDate] = useState<Date | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);

  const handleSave = () => {
    if (!data.name?.trim()) {
      Alert.alert("Required", "Please enter a medicine name.");
      return;
    }
    if (!data.type) {
      Alert.alert("Required", "Please select a type.");
      return;
    }
    if (!data.dosage?.trim()) {
      Alert.alert("Required", "Please enter a dosage.");
      return;
    }
    if (!isScheduleFrequency(data.frequency)) {
      Alert.alert("Required", "Please select a frequency.");
      return;
    }
    if (data.frequency !== ScheduleFrequency.AS_NEEDED) {
      if (data.schedules.length === 0) {
        Alert.alert(
          "Schedule Required",
          "Please add at least one schedule for this frequency."
        );
        return;
      }
    }
    onSave(data);
  };

  const typeDisplay = data.type
    ? medicationTypeLabel(data.type as MEDICATION_TYPES)
    : null;

  const frequencyDisplay = isScheduleFrequency(data.frequency)
    ? frequencyMenuLabel(data.frequency)
    : null;

  const frequencyBorderActive = showSchedulePicker;

  return (
    <>
      <KeyboardAvoidingView
        style={[styles.flex1, { backgroundColor: screenBg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ paddingTop: insets.top + HEALTH_LAYOUT.headerTopPad }}>
          <View
            style={[
              styles.headerRow,
              { paddingHorizontal: HEALTH_LAYOUT.screenPaddingX },
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
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
              style={[styles.headerTitle, { color: theme.foreground }]}
              numberOfLines={1}
            >
              {titleText}
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        <ScrollView
          style={styles.flex1}
          contentContainerStyle={{
            paddingHorizontal: HEALTH_LAYOUT.screenPaddingX,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 20) + 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: HEALTH_LAYOUT.fieldStackGap }}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.foreground }]}>
                Medicine Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    color: theme.foreground,
                    borderColor: "transparent",
                  },
                ]}
                value={data.name}
                onChangeText={(text) => setData({ ...data, name: text })}
                placeholder="e.g., Amoxicillin, Flea treatment"
                placeholderTextColor={theme.secondary}
                editable={!isProcessing}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.foreground }]}>
                Type
              </Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.inputRow,
                  {
                    backgroundColor: inputBg,
                    borderWidth: showTypePicker ? 2 : 0,
                    borderColor: showTypePicker ? theme.primary : "transparent",
                  },
                ]}
                onPress={() => {
                  if (isProcessing) return;
                  setShowSchedulePicker(false);
                  setShowTypePicker((open) => !open);
                }}
                disabled={isProcessing}
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: typeDisplay ? theme.foreground : theme.secondary,
                  }}
                >
                  {typeDisplay ?? "Select one..."}
                </Text>
                <Ionicons
                  name={showTypePicker ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={fieldChevronColor}
                />
              </TouchableOpacity>
              {showTypePicker ? (
                <MedicineInlineDropdownPanel>
                  {MEDICATION_TYPES_PICKER_ORDER.map((type) => {
                    const label = medicationTypeLabel(type);
                    const selected = data.type === type;
                    return (
                      <MedicineDropdownRow
                        key={type}
                        label={label}
                        selected={selected}
                        onPress={() => {
                          setData({ ...data, type });
                          setShowTypePicker(false);
                        }}
                      />
                    );
                  })}
                </MedicineInlineDropdownPanel>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.foreground }]}>
                Dosage
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBg, color: theme.foreground },
                ]}
                value={data.dosage}
                onChangeText={(text) => setData({ ...data, dosage: text })}
                placeholder="e.g., 250mg, 1 tablet, 2 mL"
                placeholderTextColor={theme.secondary}
                editable={!isProcessing}
              />
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateFieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.foreground }]}>
                  Start Date
                </Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.inputRow,
                    { backgroundColor: inputBg },
                  ]}
                  onPress={() => {
                    setEditingDateType("startDate");
                    if (data.start_date) {
                      setEditingDate(new Date(data.start_date));
                    } else {
                      setEditingDate(null);
                    }
                    setShowTypePicker(false);
                    setShowSchedulePicker(false);
                    setShowDatePicker(true);
                  }}
                  disabled={isProcessing}
                >
                  <Text style={{ fontSize: 16, color: theme.foreground }}>
                    {data.start_date
                      ? formatMedicineFormDate(data.start_date)
                      : "DD/MM/YYYY"}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={theme.primary}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.dateFieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.foreground }]}>
                  End Date
                </Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.inputRow,
                    { backgroundColor: inputBg },
                  ]}
                  onPress={() => {
                    setEditingDateType("endDate");
                    if (data.end_date) {
                      setEditingDate(new Date(data.end_date));
                    } else {
                      setEditingDate(null);
                    }
                    setShowTypePicker(false);
                    setShowSchedulePicker(false);
                    setShowDatePicker(true);
                  }}
                  disabled={isProcessing}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: data.end_date ? theme.foreground : theme.secondary,
                    }}
                  >
                    {data.end_date
                      ? formatMedicineFormDate(data.end_date)
                      : "DD/MM/YYYY"}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={theme.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.foreground }]}>
                Prescribed By (Optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBg, color: theme.foreground },
                ]}
                value={data.prescribed_by || ""}
                onChangeText={(text) =>
                  setData({ ...data, prescribed_by: text })
                }
                placeholder="Vet clinic name"
                placeholderTextColor={theme.secondary}
                editable={!isProcessing}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.foreground }]}>
                Purpose/Notes (Optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBg, color: theme.foreground },
                ]}
                value={data.purpose || ""}
                onChangeText={(text) => setData({ ...data, purpose: text })}
                placeholder="e.g., Ear infection, Flea & tick prevention"
                placeholderTextColor={theme.secondary}
                editable={!isProcessing}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.foreground }]}>
                Frequency
              </Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.inputRow,
                  {
                    backgroundColor: inputBg,
                    borderWidth: frequencyBorderActive ? 2 : 0,
                    borderColor: frequencyBorderActive ? theme.primary : "transparent",
                  },
                ]}
                onPress={() => {
                  if (isProcessing) return;
                  setShowTypePicker(false);
                  setShowSchedulePicker((open) => !open);
                }}
                disabled={isProcessing}
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: frequencyDisplay ? theme.foreground : theme.secondary,
                  }}
                >
                  {frequencyDisplay ?? "Select one..."}
                </Text>
                <Ionicons
                  name={showSchedulePicker ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={fieldChevronColor}
                />
              </TouchableOpacity>
              {showSchedulePicker ? (
                <MedicineInlineDropdownPanel>
                  {FREQUENCY_PICKER_ORDER.map((frequency) => {
                    const selected =
                      isScheduleFrequency(data.frequency) &&
                      data.frequency === frequency;
                    return (
                      <MedicineDropdownRow
                        key={frequency}
                        label={frequencyMenuLabel(frequency)}
                        selected={selected}
                        onPress={() => {
                          setData({ ...data, frequency, schedules: [] });
                          setShowSchedulePicker(false);
                        }}
                      />
                    );
                  })}
                </MedicineInlineDropdownPanel>
              ) : null}
            </View>

            {isScheduleFrequency(data.frequency) &&
            data.frequency !== ScheduleFrequency.AS_NEEDED ? (
              <ScheduleInput
                schedules={
                  {
                    frequency: data.frequency,
                    schedules: data.schedules,
                  } as MedicationSchedule
                }
                onChange={(schedules) =>
                  setData({ ...data, schedules: schedules as any })
                }
              />
            ) : null}

            <View
              style={[
                styles.footerInline,
                {
                  borderTopColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
                },
              ]}
            >
              <View style={styles.ctaSlot}>
                <Pressable
                  onPress={onClose}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  style={({ pressed }) => [
                    styles.ctaPressableInner,
                    { opacity: pressed || loading ? 0.85 : 1 },
                  ]}
                >
                  <View
                    style={[
                      styles.ctaCancelRing,
                      { borderColor: cancelBorderColor },
                    ]}
                  >
                    <LinearGradient
                      colors={cancelGradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.ctaGradientFill}
                    >
                      <Text style={[styles.ctaLabel, { color: cancelLabelColor }]}>
                        Cancel
                      </Text>
                    </LinearGradient>
                  </View>
                </Pressable>
              </View>
              <View style={[styles.ctaSlot, styles.ctaSaveSlot]}>
                <Pressable
                  onPress={handleSave}
                  disabled={loading || isProcessing}
                  accessibilityRole="button"
                  accessibilityLabel="Save medicine"
                  style={({ pressed }) => [
                    styles.ctaPressableInner,
                    {
                      opacity:
                        loading || isProcessing ? 0.55 : pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={styles.ctaSaveInnerClip}>
                    <LinearGradient
                      colors={saveGradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.ctaGradientFill}
                    >
                      <Text style={[styles.ctaLabel, { color: saveLabelColor }]}>
                        {loading || isProcessing ? "Saving…" : "Save"}
                      </Text>
                    </LinearGradient>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>

        <DateTimePicker
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onSave={(date: Date) => {
            setShowDatePicker(false);
            if (editingDateType === "startDate") {
              setData({
                ...data,
                start_date: date.toISOString(),
              });
            } else if (editingDateType === "endDate") {
              setData({
                ...data,
                end_date: date.toISOString(),
              });
            }
          }}
          date={editingDate || new Date()}
          mode="date"
        />

      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: HEALTH_LAYOUT.headerBottomPad,
  },
  headerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  fieldLabel: {
    fontSize: FIELD_LABEL_FS,
    fontWeight: "700",
  },
  /** Figma: column, align-items flex-start, gap xs-plus, align-self stretch */
  fieldGroup: {
    alignSelf: "stretch",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: HEALTH_LAYOUT.fieldLabelToControlGap,
    width: "100%",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    alignSelf: "stretch",
    width: "100%",
  },
  dateFieldGroup: {
    flex: 1,
    minWidth: 0,
    alignSelf: "stretch",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: HEALTH_LAYOUT.fieldLabelToControlGap,
  },
  input: {
    borderRadius: INPUT_RADIUS,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    alignSelf: "stretch",
    width: "100%",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  /** In-scroll actions — below Frequency / schedule; avoids fixed footer collapse. */
  footerInline: {
    flexDirection: "row",
    alignItems: "stretch",
    alignSelf: "stretch",
    width: "100%",
    gap: CTA_ROW_GAP,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  /**
   * RN: `Pressable` + `flex:1` often sizes to content (Save stayed narrow). Slot
   * owns flex; inner pressable is width 100% for equal halves.
   */
  ctaSlot: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  ctaPressableInner: {
    width: "100%",
    borderRadius: CTA_RADIUS,
    overflow: "visible",
  },
  ctaSaveSlot: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: { elevation: 5 },
    }),
  },
  ctaCancelRing: {
    width: "100%",
    minWidth: 0,
    borderRadius: CTA_RADIUS,
    borderWidth: 1,
    overflow: "hidden",
  },
  ctaSaveInnerClip: {
    width: "100%",
    minWidth: 0,
    borderRadius: CTA_RADIUS,
    overflow: "hidden",
  },
  /** No flex:1 — inside ScrollView; heights from padding like NewMessageModal */
  ctaGradientFill: {
    width: "100%",
    minWidth: 0,
    borderRadius: CTA_RADIUS,
    paddingVertical: CTA_PADDING_V,
    paddingHorizontal: CTA_PADDING_H,
    justifyContent: "center",
    alignItems: "center",
  },
  ctaLabel: {
    fontSize: CTA_FONT_SIZE,
    fontWeight: "600",
  },
});

export default MedicineForm;
