import { ScheduleFrequency } from "@/constants/schedules";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

type FrequencySelectorProps = {
  showFrequencyPicker: boolean;
  setShowFrequencyPicker: (show: boolean) => void;
  selectedFrequency: ScheduleFrequency;
  onSelectFrequency: (frequency: ScheduleFrequency) => void;
};

const FrequencySelector: React.FC<FrequencySelectorProps> = ({
  showFrequencyPicker,
  setShowFrequencyPicker,
  selectedFrequency,
  onSelectFrequency,
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={showFrequencyPicker}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowFrequencyPicker(false)}
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
              Select Frequency
            </Text>
            <TouchableOpacity
              onPress={() => setShowFrequencyPicker(false)}
              className="w-10 h-10 items-center justify-center"
            >
              <Ionicons name="close" size={28} color={theme.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {Object.values(ScheduleFrequency).map((frequency) => (
              <TouchableOpacity
                key={frequency}
                className="py-4 border-b"
                style={{ borderBottomColor: theme.card }}
                onPress={() => {
                  onSelectFrequency(frequency);
                }}
              >
                <Text
                  className="text-base"
                  style={{
                    color:
                      selectedFrequency === frequency
                        ? theme.primary
                        : theme.foreground,
                    fontWeight:
                      selectedFrequency === frequency ? "600" : "normal",
                  }}
                >
                  {frequency}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default FrequencySelector;
