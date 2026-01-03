import { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

interface TransferQRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  pet: Pet;
  qrCodeData?: string; // The data/URL to encode in the QR code
}

export const TransferQRCodeModal: React.FC<TransferQRCodeModalProps> = ({
  visible,
  onClose,
  pet,
  qrCodeData,
}) => {
  const { theme, mode } = useTheme();

  // Generate QR code data - this would typically come from backend
  // For now, we'll create a placeholder URL/identifier
  const qrValue = qrCodeData || `pawbuck://transfer/${pet.id}`;

  const handleSaveQR = () => {
    Alert.alert(
      "Save QR Code",
      "To save the QR code, please take a screenshot of this screen.",
      [{ text: "OK" }]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {/* Header */}
        <View
          className="px-6 pt-4 pb-4 border-b"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          }}
        >
          <View className="flex-row items-center justify-between">
            <Text
              className="text-xl font-bold"
              style={{ color: theme.foreground }}
            >
              Transfer QR Code
            </Text>
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
          {/* Description */}
          <Text
            className="text-base mb-6 text-center"
            style={{ color: theme.secondary }}
          >
            The new owner can scan this code to receive {pet.name}'s complete pet records
          </Text>

          {/* QR Code Card */}
          <View
            className="rounded-2xl p-6 mb-6 items-center"
            style={{
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <View
              className="p-4 rounded-2xl mb-4"
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <QRCode
                value={qrValue}
                size={200}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>

            {/* Pet Name */}
            <Text
              className="text-2xl font-bold mb-2"
              style={{ color: theme.foreground }}
            >
              {pet.name}
            </Text>

            {/* Microchip Number */}
            {pet.microchip_number && (
              <Text
                className="text-base"
                style={{ color: theme.secondary }}
              >
                Microchip: {pet.microchip_number}
              </Text>
            )}
          </View>

          {/* Important Notice Card */}
          <View
            className="rounded-xl p-4 mb-6"
            style={{
              backgroundColor: mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F3F4F6",
            }}
          >
            <Text
              className="text-sm leading-5"
              style={{ color: theme.foreground }}
            >
              This QR code expires in 24 hours and can only be used once. The new owner must have the PawBuck app installed to complete the transfer.
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleSaveQR}
              className="flex-1 rounded-2xl py-4 px-6 flex-row items-center justify-center"
              style={{ backgroundColor: theme.primary }}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <Text
                className="text-base font-semibold ml-2"
                style={{ color: "#FFFFFF" }}
              >
                Save QR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              className="flex-1 rounded-2xl py-4 px-6 items-center justify-center"
              style={{
                backgroundColor: mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "#F3F4F6",
              }}
              activeOpacity={0.7}
            >
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

