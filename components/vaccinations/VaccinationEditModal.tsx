import { useTheme } from "@/context/themeContext";
import { Tables, TablesUpdate } from "@/database.types";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
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
  View,
} from "react-native";

interface VaccinationEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, data: TablesUpdate<"vaccinations">) => void;
  vaccination: Tables<"vaccinations">;
  loading?: boolean;
}

export const VaccinationEditModal: React.FC<VaccinationEditModalProps> = ({
  visible,
  onClose,
  onSave,
  vaccination,
  loading = false,
}) => {
  const { theme } = useTheme();
  const [name, setName] = useState(vaccination.name);
  const [date, setDate] = useState(vaccination.date);
  const [nextDueDate, setNextDueDate] = useState(vaccination.next_due_date);
  const [clinicName, setClinicName] = useState(vaccination.clinic_name || "");
  const [notes, setNotes] = useState(vaccination.notes || "");
  const [showVaccinationDatePicker, setShowVaccinationDatePicker] =
    useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(vaccination.date);
  const [tempNextDueDate, setTempNextDueDate] = useState(vaccination.next_due_date);

  const handleSave = () => {
    // Validate required fields
    if (!name.trim()) {
      Alert.alert("Required Field", "Please enter the vaccine name");
      return;
    }
    if (!date) {
      Alert.alert("Required Field", "Please select the vaccination date");
      return;
    }

    const updateData: TablesUpdate<"vaccinations"> = {
      name,
      date,
      next_due_date: nextDueDate,
      clinic_name: clinicName || null,
      notes: notes || null,
    };

    onSave(vaccination.id, updateData);
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
              Edit Vaccination
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
              value={name}
              onChangeText={setName}
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
                {formatDate(date)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setTempDate(date);
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
                          setTempDate(date); // Reset to original
                        }}
                      >
                        <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setDate(tempDate);
                          setShowVaccinationDatePicker(false);
                        }}
                      >
                        <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    {/* Date Picker */}
                    <DateTimePicker
                      value={tempDate ? new Date(tempDate) : new Date()}
                      mode="date"
                      display="spinner"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          setTempDate(selectedDate.toISOString());
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
                value={date ? new Date(date) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowVaccinationDatePicker(false);
                  if (event.type === "set" && selectedDate) {
                    setDate(selectedDate.toISOString());
                  }
                }}
              />
            )}
          </View>

          {/* Next Due Date */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text
                className="text-sm font-medium"
                style={{ color: theme.secondary }}
              >
                Next Due Date
              </Text>
              {nextDueDate && (
                <TouchableOpacity
                  onPress={() => setNextDueDate(null)}
                  disabled={loading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text className="text-xs" style={{ color: theme.primary }}>
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
              
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {formatDate(nextDueDate)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setTempNextDueDate(nextDueDate);
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
                          setTempNextDueDate(nextDueDate); // Reset to original
                        }}
                      >
                        <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setNextDueDate(tempNextDueDate);
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
                value={nextDueDate ? new Date(nextDueDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDueDatePicker(false);
                  if (event.type === "set" && selectedDate) {
                    setNextDueDate(selectedDate.toISOString());
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
              value={clinicName}
              onChangeText={setClinicName}
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
              value={notes}
              onChangeText={setNotes}
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

