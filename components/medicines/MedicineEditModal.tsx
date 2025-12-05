import { useTheme } from "@/context/themeContext";
import { Medicine } from "@/services/medicines";
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

interface MedicineEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Medicine>) => void;
  medicine: Medicine;
  loading?: boolean;
}

export const MedicineEditModal: React.FC<MedicineEditModalProps> = ({
  visible,
  onClose,
  onSave,
  medicine,
  loading = false,
}) => {
  const { theme } = useTheme();
  const [name, setName] = useState(medicine.name);
  const [type, setType] = useState(medicine.type);
  const [dosage, setDosage] = useState(medicine.dosage);
  const [frequency, setFrequency] = useState(medicine.frequency);
  const [startDate, setStartDate] = useState(medicine.start_date);
  const [endDate, setEndDate] = useState(medicine.end_date);
  const [prescribedBy, setPrescribedBy] = useState(medicine.prescribed_by || "");
  const [purpose, setPurpose] = useState(medicine.purpose || "");

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(medicine.start_date);
  const [tempEndDate, setTempEndDate] = useState(medicine.end_date);

  const medicationTypes = ["Tablet", "Capsule", "Liquid", "Injection", "Topical", "Chewable", "Other"];
  const frequencies = ["Daily", "Twice Daily", "Three Times Daily", "Weekly", "Bi-weekly", "Monthly", "As Needed"];

  const handleSave = () => {
    // Validate required fields
    if (!name.trim()) {
      Alert.alert("Required Field", "Please enter the medicine name");
      return;
    }
    if (!dosage.trim()) {
      Alert.alert("Required Field", "Please enter the dosage");
      return;
    }

    const updateData: Partial<Medicine> = {
      name,
      type,
      dosage,
      frequency,
      start_date: startDate,
      end_date: endDate,
      prescribed_by: prescribedBy || null,
      purpose: purpose || null,
    };

    onSave(medicine.id, updateData);
  };

  const formatDate = (dateString: string | null | undefined) => {
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
              Edit Medicine
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
          {/* Medicine Name */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Medicine Name *
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Amoxicillin"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Type */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Type *
            </Text>
            <TouchableOpacity
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
              onPress={() => setShowTypePicker(true)}
              disabled={loading}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {type}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.secondary} />
            </TouchableOpacity>
          </View>

          {/* Dosage */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Dosage *
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={dosage}
              onChangeText={setDosage}
              placeholder="e.g., 250mg, 1 tablet"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Frequency */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Frequency *
            </Text>
            <TouchableOpacity
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
              onPress={() => setShowFrequencyPicker(true)}
              disabled={loading}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {frequency}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.secondary} />
            </TouchableOpacity>
          </View>

          {/* Start Date */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Start Date
            </Text>
            <TouchableOpacity
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
              onPress={() => {
                setTempStartDate(startDate);
                setShowStartDatePicker(true);
              }}
              disabled={loading}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {formatDate(startDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* End Date */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              End Date (Optional)
            </Text>
            <TouchableOpacity
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
              onPress={() => {
                setTempEndDate(endDate);
                setShowEndDatePicker(true);
              }}
              disabled={loading}
            >
              <Text
                className="text-base"
                style={{ color: endDate ? theme.foreground : theme.secondary }}
              >
                {formatDate(endDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* Prescribed By */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Prescribed By
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={prescribedBy}
              onChangeText={setPrescribedBy}
              placeholder="Vet clinic name"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Purpose/Notes */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Purpose/Notes
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={purpose}
              onChangeText={setPurpose}
              placeholder="e.g., Ear infection, pain relief"
              placeholderTextColor={theme.secondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          <View className="h-20" />
        </ScrollView>

        {/* Type Picker Modal */}
        <Modal
          visible={showTypePicker}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowTypePicker(false)}
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
                  Select Type
                </Text>
                <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                  <Ionicons name="close" size={28} color={theme.foreground} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {medicationTypes.map((medType) => (
                  <TouchableOpacity
                    key={medType}
                    className="py-4 border-b"
                    style={{ borderBottomColor: theme.card }}
                    onPress={() => {
                      setType(medType);
                      setShowTypePicker(false);
                    }}
                  >
                    <Text
                      className="text-base"
                      style={{
                        color: type === medType ? theme.primary : theme.foreground,
                        fontWeight: type === medType ? "600" : "normal",
                      }}
                    >
                      {medType}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Frequency Picker Modal */}
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
                <TouchableOpacity onPress={() => setShowFrequencyPicker(false)}>
                  <Ionicons name="close" size={28} color={theme.foreground} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {frequencies.map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    className="py-4 border-b"
                    style={{ borderBottomColor: theme.card }}
                    onPress={() => {
                      setFrequency(freq);
                      setShowFrequencyPicker(false);
                    }}
                  >
                    <Text
                      className="text-base"
                      style={{
                        color: frequency === freq ? theme.primary : theme.foreground,
                        fontWeight: frequency === freq ? "600" : "normal",
                      }}
                    >
                      {freq}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Start Date Picker */}
        {showStartDatePicker && Platform.OS === "ios" && (
          <Modal transparent animationType="slide">
            <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <View style={{ backgroundColor: theme.background }}>
                <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                  <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                    <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setStartDate(tempStartDate);
                      setShowStartDatePicker(false);
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempStartDate ? new Date(tempStartDate) : new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTempStartDate(selectedDate.toISOString());
                    }
                  }}
                  textColor={theme.foreground}
                />
              </View>
            </View>
          </Modal>
        )}
        {showStartDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={tempStartDate ? new Date(tempStartDate) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              if (event.type === "set" && selectedDate) {
                setStartDate(selectedDate.toISOString());
              }
              setShowStartDatePicker(false);
            }}
          />
        )}

        {/* End Date Picker */}
        {showEndDatePicker && Platform.OS === "ios" && (
          <Modal transparent animationType="slide">
            <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <View style={{ backgroundColor: theme.background }}>
                <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                  <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                    <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setEndDate(tempEndDate);
                      setShowEndDatePicker(false);
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempEndDate ? new Date(tempEndDate) : new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTempEndDate(selectedDate.toISOString());
                    }
                  }}
                  textColor={theme.foreground}
                />
              </View>
            </View>
          </Modal>
        )}
        {showEndDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={tempEndDate ? new Date(tempEndDate) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              if (event.type === "set" && selectedDate) {
                setEndDate(selectedDate.toISOString());
              }
              setShowEndDatePicker(false);
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

