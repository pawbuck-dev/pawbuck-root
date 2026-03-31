import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ScrollViewProps,
} from "react-native";
import {
  MEDICINE_DROPDOWN,
  medicineDropdownPalette,
} from "./medicineDropdownTheme";

type MedicineDropdownModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

/**
 * Figma 1340:33428 — centered panel, dim overlay, panel fill + shadow.
 */
export function MedicineDropdownModal({
  visible,
  onClose,
  title,
  children,
}: MedicineDropdownModalProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const p = medicineDropdownPalette(theme, isDark);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: p.panelBg,
              borderRadius: MEDICINE_DROPDOWN.panelRadius,
              maxHeight: MEDICINE_DROPDOWN.sheetMaxHeight,
            },
            platformSheetShadow,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.sheetTitle, { color: p.titleColor }]}>
            {title}
          </Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const medicineDropdownListContentStyle: ScrollViewProps["contentContainerStyle"] =
  {
    paddingHorizontal: MEDICINE_DROPDOWN.listPaddingH,
    paddingTop: MEDICINE_DROPDOWN.listPaddingV,
    paddingBottom: MEDICINE_DROPDOWN.listPaddingV,
    gap: MEDICINE_DROPDOWN.rowGap,
  };

/**
 * Anchored list under the field (Add Medicine dark UI) — not centered modal.
 */
export function MedicineInlineDropdownPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const p = medicineDropdownPalette(theme, isDark);

  return (
    <View
      style={[
        inlineStyles.outer,
        {
          backgroundColor: p.panelBg,
          borderRadius: MEDICINE_DROPDOWN.panelRadius,
        },
        platformSheetShadow,
      ]}
    >
      <View style={inlineStyles.inner}>{children}</View>
    </View>
  );
}

type MedicineDropdownRowProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** Figma context row (362:2122) — rounded pill, 14 / regular, trailing check when selected. */
export function MedicineDropdownRow({
  label,
  selected,
  onPress,
}: MedicineDropdownRowProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const p = medicineDropdownPalette(theme, isDark);

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          borderRadius: MEDICINE_DROPDOWN.rowRadius,
          paddingVertical: MEDICINE_DROPDOWN.rowPaddingV,
          paddingHorizontal: MEDICINE_DROPDOWN.rowPaddingH,
          backgroundColor: selected ? p.rowSelectedBg : "transparent",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text
        style={[
          styles.rowLabel,
          {
            fontSize: MEDICINE_DROPDOWN.labelFontSize,
            color: selected ? p.rowLabelColor : p.rowLabelColorMuted,
          },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
      <View style={styles.checkSlot}>
        {selected ? (
          <Ionicons
            name="checkmark-circle"
            size={MEDICINE_DROPDOWN.checkSize}
            color={p.checkColor}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const inlineStyles = StyleSheet.create({
  outer: {
    marginTop: 8,
    alignSelf: "stretch",
    width: "100%",
  },
  inner: {
    paddingVertical: MEDICINE_DROPDOWN.listPaddingV,
    paddingHorizontal: MEDICINE_DROPDOWN.listPaddingH,
    gap: MEDICINE_DROPDOWN.rowGap,
  },
});

const platformSheetShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  android: { elevation: 6 },
  default: {},
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    paddingHorizontal: MEDICINE_DROPDOWN.listPaddingH,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontWeight: "400",
    flex: 1,
    paddingRight: 8,
  },
  checkSlot: {
    width: MEDICINE_DROPDOWN.checkSize,
    height: MEDICINE_DROPDOWN.checkSize,
    alignItems: "center",
    justifyContent: "center",
  },
});
