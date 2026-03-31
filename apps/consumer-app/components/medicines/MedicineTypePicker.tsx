import {
  MEDICATION_TYPES,
  MEDICATION_TYPES_PICKER_ORDER,
  medicationTypeLabel,
} from "@/constants/medicines";
import React from "react";
import { ScrollView } from "react-native";
import {
  MedicineDropdownModal,
  MedicineDropdownRow,
  medicineDropdownListContentStyle,
} from "./MedicineDropdownModal";

type MedicineTypePickerProps = {
  showTypePicker: boolean;
  setShowTypePicker: (show: boolean) => void;
  onSelectType: (type: MEDICATION_TYPES) => void;
  /** Empty string = none selected yet */
  selectedType: MEDICATION_TYPES | "";
};

/** Figma dropdown list — panel 1340:33428, rows 362:2122 */
const MedicineTypePicker = ({
  showTypePicker,
  setShowTypePicker,
  onSelectType,
  selectedType,
}: MedicineTypePickerProps) => {
  return (
    <MedicineDropdownModal
      visible={showTypePicker}
      onClose={() => setShowTypePicker(false)}
      title="Type"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={medicineDropdownListContentStyle}
      >
        {MEDICATION_TYPES_PICKER_ORDER.map((type) => {
          const selected = selectedType === type;
          const label = medicationTypeLabel(type);
          return (
            <MedicineDropdownRow
              key={type}
              label={label}
              selected={selected}
              onPress={() => onSelectType(type)}
            />
          );
        })}
      </ScrollView>
    </MedicineDropdownModal>
  );
};

export default MedicineTypePicker;
