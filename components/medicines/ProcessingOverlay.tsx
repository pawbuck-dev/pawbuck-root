import { useTheme } from "@/context/themeContext";
import { Theme } from "@/theme/model";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

export type ProcessingStatus =
  | "idle"
  | "uploading"
  | "extracting"
  | "inserting"
  | "success"
  | "error";

type ProcessingOverlayProps = {
  status: ProcessingStatus;
  statusMessage: string;
};

const getStatusIcon = (
  status: ProcessingOverlayProps["status"]
): keyof typeof Ionicons.glyphMap => {
  switch (status) {
    case "uploading":
      return "cloud-upload-outline";
    case "extracting":
      return "document-text-outline";
    case "inserting":
      return "save-outline";
    case "success":
      return "checkmark-circle";
    case "error":
      return "close-circle";
    default:
      return "medkit";
  }
};

const getStatusColor = (
  status: ProcessingOverlayProps["status"],
  theme: Theme
) => {
  switch (status) {
    case "success":
      return "#34C759";
    case "error":
      return "#FF3B30";
    default:
      return theme.primary;
  }
};

const ProcessingOverlay = ({
  status,
  statusMessage,
}: ProcessingOverlayProps) => {
  const { theme } = useTheme();

  // Don't render anything when idle
  if (status === "idle") {
    return null;
  }

  return (
    <View
      className="absolute inset-0 items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
    >
      <View
        className="bg-white rounded-3xl p-8 items-center mx-8"
        style={{ backgroundColor: theme.background }}
      >
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-4"
          style={{
            backgroundColor:
              status === "success" || status === "error"
                ? `${getStatusColor(status, theme)}20`
                : "rgba(95, 196, 192, 0.15)",
          }}
        >
          {status === "success" || status === "error" ? (
            <Ionicons
              name={getStatusIcon(status)}
              size={48}
              color={getStatusColor(status, theme)}
            />
          ) : (
            <ActivityIndicator size="large" color={theme.primary} />
          )}
        </View>

        <Text
          className="text-lg font-semibold text-center mb-2"
          style={{ color: theme.foreground }}
        >
          {status === "uploading" && "Uploading Document"}
          {status === "extracting" && "Processing Document"}
          {status === "inserting" && "Saving Medicines"}
          {status === "success" && "Success!"}
          {status === "error" && "Error"}
        </Text>

        <Text
          className="text-sm text-center"
          style={{ color: theme.secondary }}
        >
          {statusMessage}
        </Text>
      </View>
    </View>
  );
};

export default ProcessingOverlay;
