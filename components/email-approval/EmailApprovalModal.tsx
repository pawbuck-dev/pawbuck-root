import { useEmailApproval } from "@/context/emailApprovalContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export const EmailApprovalModal: React.FC = () => {
  const { theme } = useTheme();
  const {
    currentApproval,
    isModalVisible,
    isProcessing,
    handleApprove,
    handleReject,
  } = useEmailApproval();

  if (!currentApproval) return null;

  const petName = currentApproval.pets?.name || "your pet";

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      >
        <View
          className="w-full rounded-3xl p-6"
          style={{ backgroundColor: theme.card, maxWidth: 400 }}
        >
          {/* Email Icon with Badge */}
          <View className="items-center mb-4">
            <View className="relative">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center"
                style={{ backgroundColor: `${theme.primary}20` }}
              >
                <Ionicons name="mail-open-outline" size={32} color={theme.primary} />
              </View>
              {/* Notification Badge */}
              <View
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full"
                style={{ backgroundColor: "#EF4444" }}
              />
            </View>
          </View>

          {/* Title */}
          <Text
            className="text-xl font-bold text-center mb-3"
            style={{ color: theme.foreground }}
          >
            New Vet Email Detected
          </Text>

          {/* Description */}
          <Text
            className="text-center mb-5 leading-5"
            style={{ color: theme.secondary }}
          >
            We've received an email for{" "}
            <Text style={{ color: theme.primary, fontWeight: "600" }}>
              {petName}
            </Text>{" "}
            from a vet not currently in your records.
          </Text>

          {/* Sender Card */}
          <View
            className="rounded-xl p-4 mb-5"
            style={{ backgroundColor: theme.background }}
          >
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-lg items-center justify-center mr-3"
                style={{ backgroundColor: `${theme.secondary}30` }}
              >
                <Ionicons name="person-outline" size={20} color={theme.secondary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-xs font-medium mb-1"
                  style={{ color: theme.secondary }}
                >
                  DETECTED SENDER
                </Text>
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.foreground }}
                  numberOfLines={1}
                >
                  {currentApproval.sender_email}
                </Text>
              </View>
            </View>
          </View>

          {/* Question */}
          <Text
            className="text-center mb-5"
            style={{ color: theme.secondary }}
          >
            Would you like to process this email and add this vet to {petName}'s profile?
          </Text>

          {/* Approve Button */}
          <TouchableOpacity
            className="rounded-full py-4 mb-3 flex-row items-center justify-center"
            style={{ backgroundColor: theme.primary }}
            onPress={handleApprove}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="white" />
                <Text className="text-white font-semibold ml-2 text-base">
                  Yes, Process & Add Vet
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Reject Button */}
          <TouchableOpacity
            className="py-4 items-center"
            onPress={handleReject}
            disabled={isProcessing}
          >
            <Text
              className="text-base font-medium"
              style={{ color: isProcessing ? theme.secondary : theme.foreground }}
            >
              No, Ignore Email
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

