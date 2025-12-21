import { MEDICATION_TYPES } from "@/constants/medicines";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

type MedicineTypePickerProps = {
  showTypePicker: boolean;
  setShowTypePicker: (show: boolean) => void;
  onSelectType: (type: MEDICATION_TYPES) => void;
  selectedType: MEDICATION_TYPES;
};

const MedicineTypePicker = ({
  showTypePicker,
  setShowTypePicker,
  onSelectType,
  selectedType,
}: MedicineTypePickerProps) => {
  const { theme } = useTheme();
  return (
    <Modal
      visible={showTypePicker}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowTypePicker(false)}
    >
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
      >
        <View
          className="w-11/12 max-w-md rounded-3xl p-6"
          style={{ backgroundColor: theme.background }}
        >
          <View className="flex-row justify-between items-center mb-6">
            <Text
              className="text-xl font-bold"
              style={{ color: theme.foreground }}
            >
              Select Type
            </Text>
            <TouchableOpacity
              onPress={() => setShowTypePicker(false)}
              className="w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={28} color={theme.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {Object.values(MEDICATION_TYPES).map((type) => (
              <TouchableOpacity
                key={type}
                className="py-4 border-b"
                style={{ borderBottomColor: theme.card }}
                onPress={() => {
                  onSelectType(type);
                }}
              >
                <Text
                  className="text-base"
                  style={{
                    color:
                      selectedType === type ? theme.primary : theme.foreground,
                    fontWeight: selectedType === type ? "600" : "normal",
                  }}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default MedicineTypePicker;
