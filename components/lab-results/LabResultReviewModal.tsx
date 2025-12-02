import { useTheme } from "@/context/themeContext";
import { LabTestResult } from "@/services/labResults";
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

export interface LabResultData {
  test_type: string;
  lab_name: string;
  test_date: string | null;
  ordered_by: string | null;
  results: LabTestResult[];
  document_url: string | null;
  confidence?: number;
}

interface LabResultReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: LabResultData) => void;
  initialData: LabResultData;
  loading?: boolean;
}

export const LabResultReviewModal: React.FC<LabResultReviewModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
  loading = false,
}) => {
  const { theme } = useTheme();
  const [data, setData] = useState<LabResultData>(initialData);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(initialData.test_date);

  const statusOptions = ["normal", "low", "high"];

  const handleSave = () => {
    // Validate required fields
    if (!data.test_type.trim()) {
      Alert.alert("Required Field", "Please enter the test type");
      return;
    }
    if (!data.lab_name.trim()) {
      Alert.alert("Required Field", "Please enter the lab name");
      return;
    }
    if (data.results.length === 0) {
      Alert.alert("Required Field", "At least one test result is required");
      return;
    }

    // Validate each result has required fields
    for (let i = 0; i < data.results.length; i++) {
      const result = data.results[i];
      if (!result.testName.trim()) {
        Alert.alert("Invalid Result", `Result #${i + 1} is missing test name`);
        return;
      }
      if (!result.value.trim()) {
        Alert.alert("Invalid Result", `Result #${i + 1} is missing value`);
        return;
      }
    }

    onSave(data);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const updateResult = (index: number, field: keyof LabTestResult, value: string) => {
    const newResults = [...data.results];
    newResults[index] = { ...newResults[index], [field]: value };
    setData({ ...data, results: newResults });
  };

  const deleteResult = (index: number) => {
    if (data.results.length === 1) {
      Alert.alert("Cannot Delete", "At least one test result is required");
      return;
    }
    const newResults = data.results.filter((_, i) => i !== index);
    setData({ ...data, results: newResults });
  };

  const addNewResult = () => {
    setData({
      ...data,
      results: [
        ...data.results,
        {
          testName: "",
          value: "",
          unit: "",
          referenceRange: "",
          status: "normal",
        },
      ],
    });
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
              Review Lab Result
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
          {/* Confidence Score */}
          {data.confidence && (
            <View
              className="mb-4 p-3 rounded-xl flex-row items-center"
              style={{
                backgroundColor:
                  data.confidence > 80
                    ? "rgba(34, 197, 94, 0.2)"
                    : data.confidence > 60
                    ? "rgba(251, 191, 36, 0.2)"
                    : "rgba(239, 68, 68, 0.2)",
              }}
            >
              <Ionicons
                name={
                  data.confidence > 80
                    ? "checkmark-circle"
                    : data.confidence > 60
                    ? "warning"
                    : "alert-circle"
                }
                size={20}
                color={
                  data.confidence > 80
                    ? "#22c55e"
                    : data.confidence > 60
                    ? "#fbbf24"
                    : "#ef4444"
                }
              />
              <Text
                className="text-sm font-medium ml-2"
                style={{
                  color:
                    data.confidence > 80
                      ? "#22c55e"
                      : data.confidence > 60
                      ? "#fbbf24"
                      : "#ef4444",
                }}
              >
                {data.confidence}% confidence - Please review carefully
              </Text>
            </View>
          )}

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
              value={data.test_type}
              onChangeText={(text) => setData({ ...data, test_type: text })}
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
              value={data.lab_name}
              onChangeText={(text) => setData({ ...data, lab_name: text })}
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
                setTempDate(data.test_date);
                setShowDatePicker(true);
              }}
              disabled={loading}
            >
              <Text className="text-base" style={{ color: theme.foreground }}>
                {formatDate(data.test_date)}
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
              value={data.ordered_by || ""}
              onChangeText={(text) => setData({ ...data, ordered_by: text })}
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
            Test Results * ({data.results.length})
          </Text>

          {data.results.map((result, index) => (
            <View
              key={index}
              className="mb-4 p-4 rounded-xl"
              style={{ backgroundColor: theme.card }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: theme.foreground }}
                  >
                    Result #{index + 1}
                  </Text>
                  {result.status !== "normal" && (
                    <View
                      className="ml-2 px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "rgba(239, 68, 68, 0.2)" }}
                    >
                      <Text
                        className="text-xs font-semibold capitalize"
                        style={{ color: "#ef4444" }}
                      >
                        {result.status}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => deleteResult(index)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {/* Test Name */}
              <Text
                className="text-xs font-medium mb-1"
                style={{ color: theme.secondary }}
              >
                Test Name *
              </Text>
              <TextInput
                className="p-3 rounded-lg text-sm mb-3"
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
              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    Value *
                  </Text>
                  <TextInput
                    className="p-3 rounded-lg text-sm"
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
                </View>
                <View className="w-24">
                  <Text
                    className="text-xs font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    Unit
                  </Text>
                  <TextInput
                    className="p-3 rounded-lg text-sm"
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
              </View>

              {/* Reference Range */}
              <Text
                className="text-xs font-medium mb-1"
                style={{ color: theme.secondary }}
              >
                Reference Range
              </Text>
              <TextInput
                className="p-3 rounded-lg text-sm mb-3"
                style={{
                  backgroundColor: theme.background,
                  color: theme.foreground,
                }}
                value={result.referenceRange}
                onChangeText={(text) => updateResult(index, "referenceRange", text)}
                placeholder="e.g., 6.0-17.0"
                placeholderTextColor={theme.secondary}
                editable={!loading}
              />

              {/* Status */}
              <Text
                className="text-xs font-medium mb-1"
                style={{ color: theme.secondary }}
              >
                Status
              </Text>
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
            style={{
              backgroundColor: theme.card,
              borderColor: theme.primary,
              borderWidth: 1,
            }}
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
            <View
              className="flex-1 justify-end"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <View style={{ backgroundColor: theme.background }}>
                <View
                  className="flex-row justify-between items-center px-4 py-2 border-b"
                  style={{ borderBottomColor: theme.card }}
                >
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={{ color: theme.primary, fontSize: 16 }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setData({ ...data, test_date: tempDate });
                      setShowDatePicker(false);
                    }}
                  >
                    <Text
                      style={{
                        color: theme.primary,
                        fontSize: 16,
                        fontWeight: "600",
                      }}
                    >
                      Done
                    </Text>
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
                setData({ ...data, test_date: selectedDate.toISOString() });
              }
              setShowDatePicker(false);
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

