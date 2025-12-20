import { useTheme } from "@/context/themeContext";
import { ClinicalExamData } from "@/models/clinicalExam";
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

interface ClinicalExamReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ClinicalExamData) => void;
  initialData: ClinicalExamData;
  loading?: boolean;
}

export const ClinicalExamReviewModal: React.FC<ClinicalExamReviewModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
  loading = false,
}) => {
  const { theme } = useTheme();
  const [data, setData] = useState<ClinicalExamData>(initialData);
  const [showExamDatePicker, setShowExamDatePicker] = useState(false);
  const [showFollowUpDatePicker, setShowFollowUpDatePicker] = useState(false);
  const [showValidityDatePicker, setShowValidityDatePicker] = useState(false);
  const [tempExamDate, setTempExamDate] = useState(initialData.exam_date);
  const [tempFollowUpDate, setTempFollowUpDate] = useState(initialData.follow_up_date);
  const [tempValidityDate, setTempValidityDate] = useState(initialData.validity_date);

  // Check if this is a travel document
  const isTravelDocument = data.exam_type?.toLowerCase().includes("travel");

  const handleSave = () => {
    // Validate required fields
    if (!data.exam_type.trim()) {
      Alert.alert("Required Field", "Please enter the exam type");
      return;
    }
    if (!data.exam_date) {
      Alert.alert("Required Field", "Please select the exam date");
      return;
    }

    onSave(data);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const updateNumericField = (field: keyof ClinicalExamData, value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    setData({ ...data, [field]: numValue });
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
              Review Exam
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
              value={data.exam_type}
              onChangeText={(text) => setData({ ...data, exam_type: text })}
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
                {formatDate(data.exam_date)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setTempExamDate(data.exam_date);
                  setShowExamDatePicker(true);
                }}
                disabled={loading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
            {showExamDatePicker && Platform.OS === "ios" && (
              <Modal
                transparent
                animationType="slide"
                visible={showExamDatePicker}
              >
                <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                  <View style={{ backgroundColor: theme.background }}>
                    <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowExamDatePicker(false);
                          setTempExamDate(data.exam_date);
                        }}
                      >
                        <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setData({ ...data, exam_date: tempExamDate });
                          setShowExamDatePicker(false);
                        }}
                      >
                        <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempExamDate ? new Date(tempExamDate) : new Date()}
                      mode="date"
                      display="spinner"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          setTempExamDate(selectedDate.toISOString());
                        }
                      }}
                      textColor={theme.foreground}
                    />
                  </View>
                </View>
              </Modal>
            )}
            {showExamDatePicker && Platform.OS === "android" && (
              <DateTimePicker
                value={data.exam_date ? new Date(data.exam_date) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowExamDatePicker(false);
                  if (event.type === "set" && selectedDate) {
                    setData({ ...data, exam_date: selectedDate.toISOString() });
                  }
                }}
              />
            )}
          </View>

          {/* Clinic Name */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Clinic Name
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={data.clinic_name || ""}
              onChangeText={(text) => setData({ ...data, clinic_name: text })}
              placeholder="Veterinary clinic name"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Vet Name */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Veterinarian
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={data.vet_name || ""}
              onChangeText={(text) => setData({ ...data, vet_name: text })}
              placeholder="Dr. Name"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Vitals Section */}
          <Text
            className="text-sm font-semibold mb-3 mt-2"
            style={{ color: theme.primary }}
          >
            VITALS
          </Text>

          {/* Weight */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: theme.secondary }}
              >
                Weight
              </Text>
              <TextInput
                className="p-4 rounded-xl text-base"
                style={{
                  backgroundColor: theme.card,
                  color: theme.foreground,
                }}
                value={data.weight_value?.toString() || ""}
                onChangeText={(text) => updateNumericField("weight_value", text)}
                placeholder="28.5"
                placeholderTextColor={theme.secondary}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>
            <View className="w-24">
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: theme.secondary }}
              >
                Unit
              </Text>
              <TextInput
                className="p-4 rounded-xl text-base"
                style={{
                  backgroundColor: theme.card,
                  color: theme.foreground,
                }}
                value={data.weight_unit || ""}
                onChangeText={(text) => setData({ ...data, weight_unit: text })}
                placeholder="lbs"
                placeholderTextColor={theme.secondary}
                editable={!loading}
              />
            </View>
          </View>

          {/* Temperature */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Temperature (°F)
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={data.temperature?.toString() || ""}
              onChangeText={(text) => updateNumericField("temperature", text)}
              placeholder="101.2"
              placeholderTextColor={theme.secondary}
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>

          {/* Heart Rate & Respiratory Rate */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: theme.secondary }}
              >
                Heart Rate (bpm)
              </Text>
              <TextInput
                className="p-4 rounded-xl text-base"
                style={{
                  backgroundColor: theme.card,
                  color: theme.foreground,
                }}
                value={data.heart_rate?.toString() || ""}
                onChangeText={(text) => updateNumericField("heart_rate", text)}
                placeholder="92"
                placeholderTextColor={theme.secondary}
                keyboardType="number-pad"
                editable={!loading}
              />
            </View>
            <View className="flex-1">
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: theme.secondary }}
              >
                Resp. Rate
              </Text>
              <TextInput
                className="p-4 rounded-xl text-base"
                style={{
                  backgroundColor: theme.card,
                  color: theme.foreground,
                }}
                value={data.respiratory_rate?.toString() || ""}
                onChangeText={(text) => updateNumericField("respiratory_rate", text)}
                placeholder="20"
                placeholderTextColor={theme.secondary}
                keyboardType="number-pad"
                editable={!loading}
              />
            </View>
          </View>

          {/* Findings */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Findings
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
                minHeight: 80,
              }}
              value={data.findings || ""}
              onChangeText={(text) => setData({ ...data, findings: text })}
              placeholder="Clinical findings and observations..."
              placeholderTextColor={theme.secondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          {/* Notes/Recommendations */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Notes / Recommendations
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
                minHeight: 80,
              }}
              value={data.notes || ""}
              onChangeText={(text) => setData({ ...data, notes: text })}
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
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Follow-up Date
            </Text>
            <View
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {formatDate(data.follow_up_date)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setTempFollowUpDate(data.follow_up_date);
                  setShowFollowUpDatePicker(true);
                }}
                disabled={loading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
            {showFollowUpDatePicker && Platform.OS === "ios" && (
              <Modal
                transparent
                animationType="slide"
                visible={showFollowUpDatePicker}
              >
                <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                  <View style={{ backgroundColor: theme.background }}>
                    <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowFollowUpDatePicker(false);
                          setTempFollowUpDate(data.follow_up_date);
                        }}
                      >
                        <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setData({ ...data, follow_up_date: tempFollowUpDate });
                          setShowFollowUpDatePicker(false);
                        }}
                      >
                        <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempFollowUpDate ? new Date(tempFollowUpDate) : new Date()}
                      mode="date"
                      display="spinner"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          setTempFollowUpDate(selectedDate.toISOString());
                        }
                      }}
                      textColor={theme.foreground}
                    />
                  </View>
                </View>
              </Modal>
            )}
            {showFollowUpDatePicker && Platform.OS === "android" && (
              <DateTimePicker
                value={data.follow_up_date ? new Date(data.follow_up_date) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowFollowUpDatePicker(false);
                  if (event.type === "set" && selectedDate) {
                    setData({ ...data, follow_up_date: selectedDate.toISOString() });
                  }
                }}
              />
            )}
          </View>

          {/* Validity Date - Only for Travel Documents */}
          {isTravelDocument && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <Text
                  className="text-sm font-medium"
                  style={{ color: theme.secondary }}
                >
                  Valid Until
                </Text>
                {data.validity_date && (
                  <TouchableOpacity
                    onPress={() => setData({ ...data, validity_date: null })}
                    disabled={loading}
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
                  {formatDate(data.validity_date)}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setTempValidityDate(data.validity_date);
                    setShowValidityDatePicker(true);
                  }}
                  disabled={loading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>
              {showValidityDatePicker && Platform.OS === "ios" && (
                <Modal
                  transparent
                  animationType="slide"
                  visible={showValidityDatePicker}
                >
                  <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <View style={{ backgroundColor: theme.background }}>
                      <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                        <TouchableOpacity
                          onPress={() => {
                            setShowValidityDatePicker(false);
                            setTempValidityDate(data.validity_date);
                          }}
                        >
                          <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setData({ ...data, validity_date: tempValidityDate });
                            setShowValidityDatePicker(false);
                          }}
                        >
                          <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={tempValidityDate ? new Date(tempValidityDate) : new Date()}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            setTempValidityDate(selectedDate.toISOString());
                          }
                        }}
                        textColor={theme.foreground}
                      />
                    </View>
                  </View>
                </Modal>
              )}
              {showValidityDatePicker && Platform.OS === "android" && (
                <DateTimePicker
                  value={data.validity_date ? new Date(data.validity_date) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowValidityDatePicker(false);
                    if (event.type === "set" && selectedDate) {
                      setData({ ...data, validity_date: selectedDate.toISOString() });
                    }
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
