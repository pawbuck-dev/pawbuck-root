import { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TransferOwnershipModalProps {
  visible: boolean;
  onClose: () => void;
  pet: Pet;
  onGenerateQRCode: () => void;
}

export const TransferOwnershipModal: React.FC<TransferOwnershipModalProps> = ({
  visible,
  onClose,
  pet,
  onGenerateQRCode,
}) => {
  const { theme, mode } = useTheme();
  const { top, bottom } = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        className="flex-1"
        style={{
          backgroundColor: theme.background,
          paddingTop: Platform.OS === "android" ? top : 0,
          paddingBottom: Platform.OS === "android" ? bottom : 0,
        }}
      >
        {/* Header */}
        <View
          className="px-6 pt-4 pb-4 border-b"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: `${theme.primary}15` }}
              >
                <Ionicons name="person-add-outline" size={20} color={theme.primary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-xl font-bold"
                  style={{ color: theme.foreground }}
                >
                  Transfer Ownership
                </Text>
                <Text className="text-sm mt-0.5" style={{ color: theme.secondary }}>
                  Transfer {pet.name} to a new pet parent
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: theme.background }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={theme.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6 pt-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Important Reminder Card */}
          <View
            className="rounded-2xl p-5 mb-6"
            style={{
              backgroundColor: mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F9F6F0",
            }}
          >
            <View className="flex-row items-start mb-4">
              <Ionicons
                name="warning"
                size={24}
                color="#F59E0B"
                style={{ marginRight: 12, marginTop: 2 }}
              />
              <View className="flex-1">
                <Text
                  className="text-lg font-bold mb-3"
                  style={{ color: theme.foreground }}
                >
                  Important Reminder
                </Text>
                <Text
                  className="text-base mb-4"
                  style={{ color: theme.foreground }}
                >
                  The new owner must officially register the ownership change:
                </Text>

                <View className="mb-4">
                  <View className="flex-row items-start mb-2">
                    <Text
                      className="text-base mr-2"
                      style={{ color: theme.foreground }}
                    >
                      •{" "}
                    </Text>
                    <View className="flex-1">
                      <Text
                        className="text-base font-semibold"
                        style={{ color: theme.foreground }}
                      >
                        Microchip database
                      </Text>
                      <Text
                        className="text-base"
                        style={{ color: theme.foreground }}
                      >
                        {" "}
                        - Update to new owner's contact (critical if pet is lost)
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-start mb-2">
                    <Text
                      className="text-base mr-2"
                      style={{ color: theme.foreground }}
                    >
                      •{" "}
                    </Text>
                    <View className="flex-1">
                      <Text
                        className="text-base font-semibold"
                        style={{ color: theme.foreground }}
                      >
                        Local authorities
                      </Text>
                      <Text
                        className="text-base"
                        style={{ color: theme.foreground }}
                      >
                        {" "}
                        - Required in many cities/municipalities
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-start">
                    <Text
                      className="text-base mr-2"
                      style={{ color: theme.foreground }}
                    >
                      •{" "}
                    </Text>
                    <View className="flex-1">
                      <Text
                        className="text-base font-semibold"
                        style={{ color: theme.foreground }}
                      >
                        Pet passport
                      </Text>
                      <Text
                        className="text-base"
                        style={{ color: theme.foreground }}
                      >
                        {" "}
                        - Update ownership details for international travel
                      </Text>
                    </View>
                  </View>
                </View>

                <Text
                  className="text-base mt-2"
                  style={{ color: theme.secondary }}
                >
                  Also remember to transfer: Vaccination records, medical history, and any insurance policies.
                </Text>
              </View>
            </View>
          </View>

          {/* Generate QR Code Button */}
          <TouchableOpacity
            onPress={onGenerateQRCode}
            className="rounded-2xl py-4 px-6 flex-row items-center justify-center"
            style={{ backgroundColor: theme.primary }}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={24} color="#FFFFFF" />
            <Text
              className="text-base font-semibold ml-3"
              style={{ color: "#FFFFFF" }}
            >
              Generate Transfer QR Code
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

