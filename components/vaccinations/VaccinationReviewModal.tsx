import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export interface VaccinationData {
  vaccine_name: string;
  vaccination_date: string;
  next_due_date: string | null;
  vet_clinic_name: string | null;
  notes: string | null;
  document_url: string | null;
}

interface VaccinationReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: VaccinationData) => void;
  initialData: VaccinationData;
  documentUri?: string;
  loading?: boolean;
}

export const VaccinationReviewModal: React.FC<VaccinationReviewModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
  documentUri,
  loading = false,
}) => {
  const { theme } = useTheme();
  const [data, setData] = useState<VaccinationData>(initialData);
  const [showVaccinationDatePicker, setShowVaccinationDatePicker] =
    useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [tempVaccinationDate, setTempVaccinationDate] = useState(initialData.vaccination_date);
  const [tempNextDueDate, setTempNextDueDate] = useState(initialData.next_due_date);

  const handleSave = () => {
    // Validate required fields
    if (!data.vaccine_name.trim()) {
      Alert.alert("Required Field", "Please enter the vaccine name");
      return;
    }
    if (!data.vaccination_date) {
      Alert.alert("Required Field", "Please select the vaccination date");
      return;
    }

    onSave(data);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ backgroundColor: theme.background }}
      >
        {/* Header */}
        <View
          className="px-6 pt-4 pb-4 border-b"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.background,
          }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Text className="text-base" style={{ color: theme.primary }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text
              className="text-lg font-semibold"
              style={{ color: theme.foreground }}
            >
              Review Vaccination
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              <Text
                className="text-base font-semibold"
                style={{ color: loading ? theme.secondary : theme.primary }}
              >
                {loading ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6 pt-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Document Preview */}
          {(documentUri || data.document_url) && (
            <View className="mb-6">
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: theme.secondary }}
              >
                Document
              </Text>
              <View className="rounded-2xl overflow-hidden">
                <Image
                  source={{ uri: documentUri || data.document_url || "" }}
                  style={{ width: "100%", height: 200 }}
                  contentFit="cover"
                />
              </View>
            </View>
          )}

          {/* Vaccine Name */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Vaccine Name *
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={data.vaccine_name}
              onChangeText={(text) => setData({ ...data, vaccine_name: text })}
              placeholder="e.g., Rabies, DHPP"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Vaccination Date */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Vaccination Date *
            </Text>
            <View
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {formatDate(data.vaccination_date)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setTempVaccinationDate(data.vaccination_date);
                  setShowVaccinationDatePicker(true);
                }}
                disabled={loading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
            {showVaccinationDatePicker && Platform.OS === "ios" && (
              <Modal
                transparent
                animationType="slide"
                visible={showVaccinationDatePicker}
              >
                <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                  <View style={{ backgroundColor: theme.background }}>
                    {/* Buttons */}
                    <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowVaccinationDatePicker(false);
                          setTempVaccinationDate(data.vaccination_date);
                        }}
                      >
                        <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setData({
                            ...data,
                            vaccination_date: tempVaccinationDate,
                          });
                          setShowVaccinationDatePicker(false);
                        }}
                      >
                        <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    {/* Date Picker */}
                    <DateTimePicker
                      value={tempVaccinationDate ? new Date(tempVaccinationDate) : new Date()}
                      mode="date"
                      display="spinner"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          setTempVaccinationDate(selectedDate.toISOString());
                        }
                      }}
                      textColor={theme.foreground}
                    />
                  </View>
                </View>
              </Modal>
            )}
            {showVaccinationDatePicker && Platform.OS === "android" && (
              <DateTimePicker
                value={
                  data.vaccination_date
                    ? new Date(data.vaccination_date)
                    : new Date()
                }
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowVaccinationDatePicker(false);
                  if (event.type === "set" && selectedDate) {
                    setData({
                      ...data,
                      vaccination_date: selectedDate.toISOString(),
                    });
                  }
                }}
              />
            )}
          </View>

          {/* Next Due Date */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Next Due Date
            </Text>
            <View
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {formatDate(data.next_due_date)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setTempNextDueDate(data.next_due_date);
                  setShowDueDatePicker(true);
                }}
                disabled={loading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
            {showDueDatePicker && Platform.OS === "ios" && (
              <Modal
                transparent
                animationType="slide"
                visible={showDueDatePicker}
              >
                <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                  <View style={{ backgroundColor: theme.background }}>
                    {/* Buttons */}
                    <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowDueDatePicker(false);
                          setTempNextDueDate(data.next_due_date);
                        }}
                      >
                        <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setData({
                            ...data,
                            next_due_date: tempNextDueDate,
                          });
                          setShowDueDatePicker(false);
                        }}
                      >
                        <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    {/* Date Picker */}
                    <DateTimePicker
                      value={tempNextDueDate ? new Date(tempNextDueDate) : new Date()}
                      mode="date"
                      display="spinner"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          setTempNextDueDate(selectedDate.toISOString());
                        }
                      }}
                      textColor={theme.foreground}
                    />
                  </View>
                </View>
              </Modal>
            )}
            {showDueDatePicker && Platform.OS === "android" && (
              <DateTimePicker
                value={
                  data.next_due_date ? new Date(data.next_due_date) : new Date()
                }
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDueDatePicker(false);
                  if (event.type === "set" && selectedDate) {
                    setData({
                      ...data,
                      next_due_date: selectedDate.toISOString(),
                    });
                  }
                }}
              />
            )}
          </View>

          {/* Vet Clinic */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Vet Clinic
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={data.vet_clinic_name || ""}
              onChangeText={(text) =>
                setData({ ...data, vet_clinic_name: text })
              }
              placeholder="Clinic name"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Notes */}
          <View className="mb-6">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Notes
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={data.notes || ""}
              onChangeText={(text) => setData({ ...data, notes: text })}
              placeholder="Additional notes..."
              placeholderTextColor={theme.secondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          <View className="h-20" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};



