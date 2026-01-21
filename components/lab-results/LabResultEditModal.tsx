import { useTheme } from "@/context/themeContext";
import { LabResult, LabTestResult } from "@/services/labResults";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface LabResultEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<LabResult>) => void;
  labResult: LabResult;
  loading?: boolean;
}

export const LabResultEditModal: React.FC<LabResultEditModalProps> = ({
  visible,
  onClose,
  onSave,
  labResult,
  loading = false,
}) => {
  const { theme } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const [testType, setTestType] = useState(labResult.test_type);
  const [labName, setLabName] = useState(labResult.lab_name);
  const [testDate, setTestDate] = useState(labResult.test_date);
  const [orderedBy, setOrderedBy] = useState(labResult.ordered_by || "");
  const [results, setResults] = useState<LabTestResult[]>(labResult.results);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(labResult.test_date);
  const [editingResultIndex, setEditingResultIndex] = useState<number | null>(null);

  const statusOptions = ["normal", "low", "high"];

  const handleSave = () => {
    // Validate required fields
    if (!testType.trim()) {
      Alert.alert("Required Field", "Please enter the test type");
      return;
    }
    if (!labName.trim()) {
      Alert.alert("Required Field", "Please enter the lab name");
      return;
    }
    if (results.length === 0) {
      Alert.alert("Required Field", "At least one test result is required");
      return;
    }

    const updateData: Partial<LabResult> = {
      test_type: testType,
      lab_name: labName,
      test_date: testDate,
      ordered_by: orderedBy || null,
      results,
    };

    onSave(labResult.id, updateData);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const updateResult = (index: number, field: keyof LabTestResult, value: string) => {
    const newResults = [...results];
    newResults[index] = { ...newResults[index], [field]: value };
    setResults(newResults);
  };

  const deleteResult = (index: number) => {
    if (results.length === 1) {
      Alert.alert("Cannot Delete", "At least one test result is required");
      return;
    }
    const newResults = results.filter((_, i) => i !== index);
    setResults(newResults);
  };

  const addNewResult = () => {
    setResults([
      ...results,
      {
        testName: "",
        value: "",
        unit: "",
        referenceRange: "",
        status: "normal",
      },
    ]);
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
        style={{
          backgroundColor: theme.background,
          paddingTop: Platform.OS === "android" ? top : 0,
          paddingBottom: Platform.OS === "android" ? bottom : 0,
        }}
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
              Edit Lab Result
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
          {/* Test Type */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Test Type *
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={testType}
              onChangeText={setTestType}
              placeholder="e.g., Complete Blood Count"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Lab Name */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Laboratory Name *
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={labName}
              onChangeText={setLabName}
              placeholder="Laboratory name"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Test Date */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Test Date
            </Text>
            <TouchableOpacity
              className="p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: theme.card }}
              onPress={() => {
                setTempDate(testDate);
                setShowDatePicker(true);
              }}
              disabled={loading}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {formatDate(testDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* Ordered By */}
          <View className="mb-4">
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: theme.secondary }}
            >
              Ordered By
            </Text>
            <TextInput
              className="p-4 rounded-xl text-base"
              style={{
                backgroundColor: theme.card,
                color: theme.foreground,
              }}
              value={orderedBy}
              onChangeText={setOrderedBy}
              placeholder="Veterinarian name"
              placeholderTextColor={theme.secondary}
              editable={!loading}
            />
          </View>

          {/* Test Results */}
          <Text
            className="text-lg font-semibold mb-3 mt-2"
            style={{ color: theme.foreground }}
          >
            Test Results *
          </Text>

          {results.map((result, index) => (
            <View
              key={index}
              className="mb-4 p-4 rounded-xl"
              style={{ backgroundColor: theme.card }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  className="text-sm font-semibold"
                  style={{ color: theme.foreground }}
                >
                  Result #{index + 1}
                </Text>
                <TouchableOpacity onPress={() => deleteResult(index)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {/* Test Name */}
              <TextInput
                className="p-3 rounded-lg text-sm mb-2"
                style={{
                  backgroundColor: theme.background,
                  color: theme.foreground,
                }}
                value={result.testName}
                onChangeText={(text) => updateResult(index, "testName", text)}
                placeholder="Test name"
                placeholderTextColor={theme.secondary}
                editable={!loading}
              />

              {/* Value and Unit */}
              <View className="flex-row gap-2 mb-2">
                <TextInput
                  className="flex-1 p-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: theme.background,
                    color: theme.foreground,
                  }}
                  value={result.value}
                  onChangeText={(text) => updateResult(index, "value", text)}
                  placeholder="Value"
                  placeholderTextColor={theme.secondary}
                  editable={!loading}
                />
                <TextInput
                  className="w-24 p-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: theme.background,
                    color: theme.foreground,
                  }}
                  value={result.unit}
                  onChangeText={(text) => updateResult(index, "unit", text)}
                  placeholder="Unit"
                  placeholderTextColor={theme.secondary}
                  editable={!loading}
                />
              </View>

              {/* Reference Range */}
              <TextInput
                className="p-3 rounded-lg text-sm mb-2"
                style={{
                  backgroundColor: theme.background,
                  color: theme.foreground,
                }}
                value={result.referenceRange}
                onChangeText={(text) => updateResult(index, "referenceRange", text)}
                placeholder="Reference range (e.g., 6.0-17.0)"
                placeholderTextColor={theme.secondary}
                editable={!loading}
              />

              {/* Status */}
              <View className="flex-row gap-2">
                {statusOptions.map((status) => (
                  <TouchableOpacity
                    key={status}
                    className="flex-1 p-2 rounded-lg"
                    style={{
                      backgroundColor:
                        result.status === status
                          ? theme.primary
                          : theme.background,
                    }}
                    onPress={() =>
                      updateResult(index, "status", status as "normal" | "low" | "high")
                    }
                    disabled={loading}
                  >
                    <Text
                      className="text-xs text-center font-medium capitalize"
                      style={{
                        color:
                          result.status === status
                            ? "#FFFFFF"
                            : theme.foreground,
                      }}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Add New Result Button */}
          <TouchableOpacity
            className="p-4 rounded-xl flex-row items-center justify-center mb-4"
            style={{ backgroundColor: theme.card, borderColor: theme.primary, borderWidth: 1 }}
            onPress={addNewResult}
            disabled={loading}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
            <Text
              className="text-base font-medium ml-2"
              style={{ color: theme.primary }}
            >
              Add Test Result
            </Text>
          </TouchableOpacity>

          <View className="h-20" />
        </ScrollView>

        {/* Date Picker */}
        {showDatePicker && Platform.OS === "ios" && (
          <Modal transparent animationType="slide">
            <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <View style={{ backgroundColor: theme.background }}>
                <View className="flex-row justify-between items-center px-4 py-2 border-b" style={{ borderBottomColor: theme.card }}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setTestDate(tempDate);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
                  </TouchableOpacity>
                </View>
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
        {showDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={tempDate ? new Date(tempDate) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              if (event.type === "set" && selectedDate) {
                setTestDate(selectedDate.toISOString());
              }
              setShowDatePicker(false);
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

