import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import { useMedicines } from "@/context/medicinesContext";
import { useTheme } from "@/context/themeContext";
import { MedicineData } from "@/models/medication";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { MedicineEditModal } from "./MedicineEditModal";

interface MedicineCardProps {
  medicine: MedicineData;
}

export const MedicineCard: React.FC<MedicineCardProps> = ({ medicine }) => {
  const { theme } = useTheme();
  const { deleteMedicineMutation } = useMedicines();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const hasDocument = !!medicine.document_url;

  const handleDelete = () => {
    Alert.alert(
      "Delete Medicine",
      "Are you sure you want to delete this medicine record?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMedicineMutation.mutate(medicine.id || "", {
              onSuccess: () => {
                Alert.alert("Success", "Medicine deleted successfully");
              },
              onError: (error) => {
                Alert.alert("Error", "Failed to delete medicine");
                console.error("Delete error:", error);
              },
            });
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleViewDocument = () => {
    setShowDocumentModal(true);
  };

  const handleLongPress = () => {
    const options: {
      text: string;
      onPress?: () => void;
      style?: "cancel" | "destructive";
    }[] = [];

    if (hasDocument) {
      options.push({
        text: "View Document",
        onPress: handleViewDocument,
      });
    }

    options.push(
      {
        text: "Edit",
        onPress: handleEdit,
      },
      {
        text: "Delete",
        onPress: handleDelete,
        style: "destructive",
      },
      {
        text: "Cancel",
        style: "cancel",
      }
    );

    Alert.alert(medicine.name, "What would you like to do?", options, {
      cancelable: true,
    });
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = () => {
    const now = new Date();

    // Check if medication has ended (Completed)
    if (medicine.end_date) {
      const endDate = new Date(medicine.end_date);
      endDate.setHours(23, 59, 59, 999);
      if (endDate < now) {
        return {
          label: "Completed",
          color: theme.secondary,
          bgColor: "rgba(156, 163, 175, 0.2)",
        };
      }
    }

    // Default: Active
    return {
      label: "Active",
      color: theme.primary,
      bgColor: "rgba(95, 196, 192, 0.2)",
    };
  };

  const status = getStatusBadge();

  return (
    <>
      <TouchableOpacity
        className="mb-4 p-4 rounded-2xl"
        style={{ backgroundColor: theme.card }}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        {/* Medication Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
            >
              <MaterialCommunityIcons
                name="pill"
                size={20}
                color={theme.primary}
              />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
                numberOfLines={1}
              >
                {medicine.name}
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: status.bgColor,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: status.color,
                    }}
                  >
                    {status.label}
                  </Text>
                </View>
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
                >
                  <Text className="text-xs" style={{ color: theme.secondary }}>
                    {medicine.type}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          {hasDocument && (
            <TouchableOpacity
              className="w-9 h-9 rounded-full items-center justify-center ml-2"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
              onPress={handleViewDocument}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="document-attach"
                size={18}
                color={theme.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Medication Details */}
        <View className="ml-13">
          {medicine.purpose && (
            <Text
              className="text-sm mb-2 italic"
              style={{ color: theme.secondary }}
            >
              {medicine.purpose}
            </Text>
          )}

          <View className="flex-row items-center mb-2">
            <Ionicons name="water-outline" size={14} color={theme.secondary} />
            <Text className="text-sm ml-2" style={{ color: theme.foreground }}>
              {medicine.dosage}
            </Text>
          </View>

          <View className="flex-row items-center mb-2">
            <Ionicons name="time-outline" size={14} color={theme.secondary} />
            <Text className="text-sm ml-2" style={{ color: theme.secondary }}>
              {medicine.frequency}
            </Text>
          </View>

          {medicine.start_date && (
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="calendar-outline"
                size={14}
                color={theme.secondary}
              />
              <Text className="text-sm ml-2" style={{ color: theme.secondary }}>
                Started: {formatDate(medicine.start_date)}
                {medicine.end_date && ` - ${formatDate(medicine.end_date)}`}
              </Text>
            </View>
          )}

          {medicine.prescribed_by && (
            <View className="flex-row items-center">
              <Ionicons
                name="person-outline"
                size={14}
                color={theme.secondary}
              />
              <Text className="text-sm ml-2" style={{ color: theme.secondary }}>
                {medicine.prescribed_by}
              </Text>
            </View>
          )}
        </View>

        {/* Long press hint */}
        <Text
          className="text-xs text-center mt-3"
          style={{ color: theme.secondary, opacity: 0.6 }}
        >
          Long press to edit or delete
        </Text>
      </TouchableOpacity>

      <MedicineEditModal
        visible={showEditModal}
        medicine={medicine}
        onClose={() => setShowEditModal(false)}
        onSave={() => {
          setShowEditModal(false);
        }}
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        visible={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        documentPath={medicine.document_url || null}
        title="Prescription Document"
      />
    </>
  );
};
