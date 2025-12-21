import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import { useTheme } from "@/context/themeContext";
import { useVaccinations } from "@/context/vaccinationsContext";
import { Tables, TablesUpdate } from "@/database.types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { VaccinationEditModal } from "./VaccinationEditModal";

interface VaccinationCardProps {
  vaccination: Tables<"vaccinations">;
}

export const VaccinationCard: React.FC<VaccinationCardProps> = ({
  vaccination,
}) => {
  const { theme } = useTheme();
  const { updateVaccinationMutation, deleteVaccinationMutation } =
    useVaccinations();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const hasDocument = !!vaccination.document_url;

  const handleDelete = () => {
    Alert.alert(
      "Delete Vaccination",
      "Are you sure you want to delete this vaccination record?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteVaccinationMutation.mutate(vaccination.id, {
              onSuccess: () => {
                Alert.alert("Success", "Vaccination deleted successfully");
              },
              onError: (error) => {
                Alert.alert("Error", "Failed to delete vaccination");
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

  const handleSaveEdit = (id: string, data: TablesUpdate<"vaccinations">) => {
    updateVaccinationMutation.mutate(
      { id, data },
      {
        onSuccess: () => {
          setShowEditModal(false);
          Alert.alert("Success", "Vaccination updated successfully");
        },
        onError: (error) => {
          Alert.alert("Error", "Failed to update vaccination");
          console.error("Update error:", error);
        },
      }
    );
  };

  const handleViewDocument = () => {
    setShowDocumentModal(true);
  };

  const handleLongPress = () => {
    const options: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "destructive";
    }> = [];

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

    Alert.alert(
      vaccination.name,
      "What would you like to do?",
      options,
      { cancelable: true }
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <>
      <TouchableOpacity
        className="mb-4 p-4 rounded-2xl"
        style={{ backgroundColor: theme.card }}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        {/* Vaccine Name */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
            >
              <MaterialCommunityIcons name="needle" size={20} color={theme.primary} />
            </View>
            <Text
              className="text-base font-semibold flex-1"
              style={{ color: theme.foreground }}
              numberOfLines={2}
            >
              {vaccination.name}
            </Text>
          </View>
          {hasDocument && (
            <TouchableOpacity
              className="w-9 h-9 rounded-full items-center justify-center ml-2"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
              onPress={handleViewDocument}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="document-attach" size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Date Information */}
        <View className="ml-13">
          <View className="flex-row items-center mb-2">
            <Ionicons name="calendar-outline" size={14} color={theme.secondary} />
            <Text className="text-sm ml-2" style={{ color: theme.secondary }}>
              Administered: {formatDate(vaccination.date)}
            </Text>
          </View>

          {vaccination.next_due_date && (
            <View className="flex-row items-center mb-2">
              <Ionicons name="time-outline" size={14} color={theme.primary} />
              <Text className="text-sm ml-2" style={{ color: theme.primary }}>
                Next Due: {formatDate(vaccination.next_due_date)}
              </Text>
            </View>
          )}

          {/* Vet Clinic */}
          {vaccination.clinic_name && (
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="business-outline"
                size={14}
                color={theme.secondary}
              />
              <Text className="text-sm ml-2" style={{ color: theme.secondary }}>
                {vaccination.clinic_name}
              </Text>
            </View>
          )}

          {/* Notes */}
          {vaccination.notes && (
            <View className="flex-row items-start mt-2">
              <Ionicons
                name="document-text-outline"
                size={14}
                color={theme.secondary}
                style={{ marginTop: 2 }}
              />
              <Text
                className="text-xs ml-2 flex-1"
                style={{ color: theme.secondary }}
                numberOfLines={2}
              >
                {vaccination.notes}
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

      {/* Edit Modal */}
      <VaccinationEditModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
        vaccination={vaccination}
        loading={updateVaccinationMutation.isPending}
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        visible={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        documentPath={vaccination.document_url}
        title="Vaccination Document"
      />
    </>
  );
};





