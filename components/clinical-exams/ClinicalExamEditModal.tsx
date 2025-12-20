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

interface ClinicalExamEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, data: TablesUpdate<"clinical_exams">) => void;
  exam: Tables<"clinical_exams">;
  loading?: boolean;
}

export const ClinicalExamEditModal: React.FC<ClinicalExamEditModalProps> = ({
  visible,
  onClose,
  onSave,
  exam,
  loading = false,
}) => {
  const { theme } = useTheme();
  const [examType, setExamType] = useState(exam.exam_type || "");
  const [examDate, setExamDate] = useState(exam.exam_date);
  const [clinicName, setClinicName] = useState(exam.clinic_name || "");
  const [vetName, setVetName] = useState(exam.vet_name || "");
  const [weightValue, setWeightValue] = useState(exam.weight_value?.toString() || "");
  const [weightUnit, setWeightUnit] = useState(exam.weight_unit || "lbs");
  const [temperature, setTemperature] = useState(exam.temperature?.toString() || "");
  const [heartRate, setHeartRate] = useState(exam.heart_rate?.toString() || "");
  const [respiratoryRate, setRespiratoryRate] = useState(exam.respiratory_rate?.toString() || "");
  const [findings, setFindings] = useState(exam.findings || "");
  const [notes, setNotes] = useState(exam.notes || "");
  const [followUpDate, setFollowUpDate] = useState(exam.follow_up_date);
  const [validityDate, setValidityDate] = useState(exam.validity_date);
  
  const [showExamDatePicker, setShowExamDatePicker] = useState(false);
  const [showFollowUpDatePicker, setShowFollowUpDatePicker] = useState(false);
  const [showValidityDatePicker, setShowValidityDatePicker] = useState(false);
  const [tempExamDate, setTempExamDate] = useState(exam.exam_date);
  const [tempFollowUpDate, setTempFollowUpDate] = useState(exam.follow_up_date);
  const [tempValidityDate, setTempValidityDate] = useState(exam.validity_date);

  // Check if this is a travel document
  const isTravelDocument = examType?.toLowerCase().includes("travel");

  const handleSave = () => {
    if (!examType.trim()) {
      Alert.alert("Required Field", "Please enter the exam type");
      return;
    }
    if (!examDate) {
      Alert.alert("Required Field", "Please select the exam date");
      return;
    }

    const updateData: TablesUpdate<"clinical_exams"> = {
      exam_type: examType,
      exam_date: examDate,
      clinic_name: clinicName || null,
      vet_name: vetName || null,
      weight_value: weightValue ? parseFloat(weightValue) : null,
      weight_unit: weightUnit || null,
      temperature: temperature ? parseFloat(temperature) : null,
      heart_rate: heartRate ? parseInt(heartRate) : null,
      respiratory_rate: respiratoryRate ? parseInt(respiratoryRate) : null,
      findings: findings || null,
      notes: notes || null,
      follow_up_date: followUpDate,
      validity_date: isTravelDocument ? validityDate : null,
    };

    onSave(exam.id, updateData);
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
              Edit Exam
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
          {/* Exam Type */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Exam Type *
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={examType}
              onChangeText={setExamType}
              placeholder="e.g., Routine Checkup, Annual Wellness"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Exam Date */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Exam Date *
            </Text>
            <View
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {formatDate(examDate)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setTempExamDate(examDate);
                  setShowExamDatePicker(true);
                }}
                disabled={loading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
            {showExamDatePicker && Platform.OS === "ios" && (
              <Modal transparent animationType="slide" visible={showExamDatePicker}>
                <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                  <View style={{ backgroundColor: theme.background }}>
                    <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                      <TouchableOpacity onPress={() => { setShowExamDatePicker(false); setTempExamDate(examDate); }}>
                        <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setExamDate(tempExamDate); setShowExamDatePicker(false); }}>
                        <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempExamDate ? new Date(tempExamDate) : new Date()}
                      mode="date"
                      display="spinner"
                      onChange={(event, selectedDate) => { if (selectedDate) setTempExamDate(selectedDate.toISOString().split('T')[0]); }}
                      textColor={theme.foreground}
                    />
                  </View>
                </View>
              </Modal>
            )}
            {showExamDatePicker && Platform.OS === "android" && (
              <DateTimePicker
                value={examDate ? new Date(examDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowExamDatePicker(false);
                  if (event.type === "set" && selectedDate) setExamDate(selectedDate.toISOString().split('T')[0]);
                }}
              />
            )}
          </View>

          {/* Clinic Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
              Clinic Name
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{ backgroundColor: theme.card, color: theme.foreground }}
              value={clinicName}
              onChangeText={setClinicName}
              placeholder="Veterinary clinic name"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Vet Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
              Veterinarian
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{ backgroundColor: theme.card, color: theme.foreground }}
              value={vetName}
              onChangeText={setVetName}
              placeholder="Dr. Name"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Vitals Section */}
          <Text className="text-sm font-semibold mb-3 mt-2" style={{ color: theme.primary }}>
            VITALS
          </Text>

          {/* Weight */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
                Weight
              </Text>
              <TextInput
                className="p-4 rounded-xl text-base"
                style={{ backgroundColor: theme.card, color: theme.foreground }}
                value={weightValue}
                onChangeText={setWeightValue}
                placeholder="28.5"
                placeholderTextColor={theme.secondary}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>
            <View className="w-24">
              <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
                Unit
              </Text>
              <TextInput
                className="p-4 rounded-xl text-base"
                style={{ backgroundColor: theme.card, color: theme.foreground }}
                value={weightUnit}
                onChangeText={setWeightUnit}
                placeholder="lbs"
                placeholderTextColor={theme.secondary}
                editable={!loading}
              />
            </View>
          </View>

          {/* Temperature */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
              Temperature (°F)
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{ backgroundColor: theme.card, color: theme.foreground }}
              value={temperature}
              onChangeText={setTemperature}
              placeholder="101.2"
              placeholderTextColor={theme.secondary}
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>

          {/* Heart Rate & Respiratory Rate */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
                Heart Rate (bpm)
              </Text>
              <TextInput
                className="p-4 rounded-xl text-base"
                style={{ backgroundColor: theme.card, color: theme.foreground }}
                value={heartRate}
                onChangeText={setHeartRate}
                placeholder="92"
                placeholderTextColor={theme.secondary}
                keyboardType="number-pad"
                editable={!loading}
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
                Resp. Rate
              </Text>
              <TextInput
                className="p-4 rounded-xl text-base"
                style={{ backgroundColor: theme.card, color: theme.foreground }}
                value={respiratoryRate}
                onChangeText={setRespiratoryRate}
                placeholder="20"
                placeholderTextColor={theme.secondary}
                keyboardType="number-pad"
                editable={!loading}
              />
            </View>
          </View>

          {/* Findings */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
              Findings
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{ backgroundColor: theme.card, color: theme.foreground, minHeight: 80 }}
              value={findings}
              onChangeText={setFindings}
              placeholder="Clinical findings and observations..."
              placeholderTextColor={theme.secondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          {/* Notes */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-2" style={{ color: theme.secondary }}>
              Notes / Recommendations
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{ backgroundColor: theme.card, color: theme.foreground, minHeight: 80 }}
              value={notes}
              onChangeText={setNotes}
              placeholder="Treatment notes, recommendations..."
              placeholderTextColor={theme.secondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          {/* Follow-up Date */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-medium" style={{ color: theme.secondary }}>
                Follow-up Date
              </Text>
              {followUpDate && (
                <TouchableOpacity onPress={() => setFollowUpDate(null)} disabled={loading}>
                  <Text className="text-xs" style={{ color: theme.primary }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <View
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {formatDate(followUpDate)}
              </Text>
              <TouchableOpacity
                onPress={() => { setTempFollowUpDate(followUpDate); setShowFollowUpDatePicker(true); }}
                disabled={loading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
            {showFollowUpDatePicker && Platform.OS === "ios" && (
              <Modal transparent animationType="slide" visible={showFollowUpDatePicker}>
                <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                  <View style={{ backgroundColor: theme.background }}>
                    <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                      <TouchableOpacity onPress={() => { setShowFollowUpDatePicker(false); setTempFollowUpDate(followUpDate); }}>
                        <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setFollowUpDate(tempFollowUpDate); setShowFollowUpDatePicker(false); }}>
                        <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempFollowUpDate ? new Date(tempFollowUpDate) : new Date()}
                      mode="date"
                      display="spinner"
                      onChange={(event, selectedDate) => { if (selectedDate) setTempFollowUpDate(selectedDate.toISOString().split('T')[0]); }}
                      textColor={theme.foreground}
                    />
                  </View>
                </View>
              </Modal>
            )}
            {showFollowUpDatePicker && Platform.OS === "android" && (
              <DateTimePicker
                value={followUpDate ? new Date(followUpDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowFollowUpDatePicker(false);
                  if (event.type === "set" && selectedDate) setFollowUpDate(selectedDate.toISOString().split('T')[0]);
                }}
              />
            )}
          </View>

          {/* Validity Date - Only for Travel Documents */}
          {isTravelDocument && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium" style={{ color: theme.secondary }}>
                  Valid Until
                </Text>
                {validityDate && (
                  <TouchableOpacity onPress={() => setValidityDate(null)} disabled={loading}>
                    <Text className="text-xs" style={{ color: theme.primary }}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View
                className="p-4 rounded-xl flex-row items-center justify-between"
                style={{ backgroundColor: theme.card }}
              >
                <Text className="text-base" style={{ color: theme.foreground }}>
                  {formatDate(validityDate)}
                </Text>
                <TouchableOpacity
                  onPress={() => { setTempValidityDate(validityDate); setShowValidityDatePicker(true); }}
                  disabled={loading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>
              {showValidityDatePicker && Platform.OS === "ios" && (
                <Modal transparent animationType="slide" visible={showValidityDatePicker}>
                  <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <View style={{ backgroundColor: theme.background }}>
                      <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                        <TouchableOpacity onPress={() => { setShowValidityDatePicker(false); setTempValidityDate(validityDate); }}>
                          <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setValidityDate(tempValidityDate); setShowValidityDatePicker(false); }}>
                          <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={tempValidityDate ? new Date(tempValidityDate) : new Date()}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => { if (selectedDate) setTempValidityDate(selectedDate.toISOString().split('T')[0]); }}
                        textColor={theme.foreground}
                      />
                    </View>
                  </View>
                </Modal>
              )}
              {showValidityDatePicker && Platform.OS === "android" && (
                <DateTimePicker
                  value={validityDate ? new Date(validityDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowValidityDatePicker(false);
                    if (event.type === "set" && selectedDate) setValidityDate(selectedDate.toISOString().split('T')[0]);
                  }}
                />
              )}
            </View>
          )}

          <View className="h-20" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};
