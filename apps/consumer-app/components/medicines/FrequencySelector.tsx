import {
  FREQUENCY_PICKER_ORDER,
  frequencyMenuLabel,
  ScheduleFrequency,
} from "@/constants/schedules";
import React from "react";
import { ScrollView } from "react-native";
import {
  MedicineDropdownModal,
  MedicineDropdownRow,
  medicineDropdownListContentStyle,
} from "./MedicineDropdownModal";

type FrequencySelectorProps = {
  showFrequencyPicker: boolean;
  setShowFrequencyPicker: (show: boolean) => void;
  /** When null, no row is highlighted (Figma “Select one…”). */
  selectedFrequency: ScheduleFrequency | null;
  onSelectFrequency: (frequency: ScheduleFrequency) => void;
};

/** Modal variant — ReviewMedicines; order/labels match Add Medicine inline menu */
const FrequencySelector: React.FC<FrequencySelectorProps> = ({
  showFrequencyPicker,
  setShowFrequencyPicker,
  selectedFrequency,
  onSelectFrequency,
}) => {
  return (
    <MedicineDropdownModal
      visible={showFrequencyPicker}
      onClose={() => setShowFrequencyPicker(false)}
      title="Frequency"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={medicineDropdownListContentStyle}
      >
        {FREQUENCY_PICKER_ORDER.map((frequency) => {
          const selected =
            selectedFrequency != null && selectedFrequency === frequency;
          return (
            <MedicineDropdownRow
              key={frequency}
              label={frequencyMenuLabel(frequency)}
              selected={selected}
              onPress={() => onSelectFrequency(frequency)}
            />
          );
        })}
      </ScrollView>
    </MedicineDropdownModal>
  );
};

export default FrequencySelector;
