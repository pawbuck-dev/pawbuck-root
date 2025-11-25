import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

type Gender = "male" | "female";

interface GenderPickerProps {
  visible: boolean;
  selectedGender: Gender;
  onSelect: (gender: Gender) => void;
  onClose: () => void;
}

export default function GenderPicker({
  visible,
  selectedGender,
  onSelect,
  onClose,
}: GenderPickerProps) {
  const { theme, mode } = useTheme();
  const [tempSelection, setTempSelection] = useState<Gender>(selectedGender);

  const handleSave = () => {
    onSelect(tempSelection);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
      >
        <View
          className="w-11/12 max-w-md rounded-3xl p-6"
          style={{ backgroundColor: theme.card }}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text
              className="text-2xl font-bold"
              style={{ color: theme.foreground }}
            >
              Edit Sex
            </Text>
            <Pressable
              onPress={onClose}
              className="w-10 h-10 items-center justify-center active:opacity-70"
            >
              <Ionicons name="close" size={28} color={theme.foreground} />
            </Pressable>
          </View>

          {/* Label */}
          <Text
            className="text-base font-medium mb-4"
            style={{ color: theme.foreground }}
          >
            Sex
          </Text>

          {/* Radio Options */}
          <View className="flex-row gap-4 mb-8">
            {/* Male Option */}
            <Pressable
              onPress={() => setTempSelection("male")}
              className="flex-row items-center active:opacity-70"
            >
              <View
                className="w-6 h-6 rounded-full border-2 items-center justify-center mr-2"
                style={{
                  borderColor: theme.primary,
                }}
              >
                {tempSelection === "male" && (
                  <View
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: theme.primary }}
                  />
                )}
              </View>
              <Text
                className="text-lg"
                style={{ color: theme.foreground }}
              >
                Male
              </Text>
            </Pressable>

            {/* Female Option */}
            <Pressable
              onPress={() => setTempSelection("female")}
              className="flex-row items-center active:opacity-70"
            >
              <View
                className="w-6 h-6 rounded-full border-2 items-center justify-center mr-2"
                style={{
                  borderColor: theme.primary,
                }}
              >
                {tempSelection === "female" && (
                  <View
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: theme.primary }}
                  />
                )}
              </View>
              <Text
                className="text-lg"
                style={{ color: theme.foreground }}
              >
                Female
              </Text>
            </Pressable>
          </View>

          {/* Buttons */}
          <View className="flex-row gap-3 justify-end">
            <Pressable
              onPress={onClose}
              className="px-6 py-3 rounded-xl active:opacity-80"
              style={{ backgroundColor: theme.secondary }}
            >
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              className="px-6 py-3 rounded-xl active:opacity-80"
              style={{ backgroundColor: theme.primary }}
            >
              <Text
                className="text-base font-semibold"
                style={{ color: theme.primaryForeground }}
              >
                Save
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

