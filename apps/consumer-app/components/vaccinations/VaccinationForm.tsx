import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type VaccinationFormData = {
  name: string;
  date: string;
  next_due_date: string | null;
  clinic_name: string | null;
  notes: string | null;
};

type Props = {
  onSave: (data: VaccinationFormData) => void;
  loading?: boolean;
};

export default function VaccinationForm({ onSave, loading = false }: Props) {
  const { theme } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [nextDueDate, setNextDueDate] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState("");
  const [notes, setNotes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Required Field", "Please enter the vaccine name");
      return;
    }
    if (!date) {
      Alert.alert("Required Field", "Please select the vaccination date");
      return;
    }
    onSave({
      name: name.trim(),
      date,
      next_due_date: nextDueDate,
      clinic_name: clinicName.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? top : 0 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: bottom + 40 }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.secondary, marginBottom: 8 }}>
          Vaccine name *
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Rabies"
          placeholderTextColor={theme.secondary}
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            padding: 14,
            color: theme.foreground,
            marginBottom: 16,
          }}
        />

        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.secondary, marginBottom: 8 }}>
          Date given *
        </Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: theme.foreground }}>{new Date(date).toLocaleDateString()}</Text>
        </TouchableOpacity>
        {showDatePicker ? (
          <DateTimePicker
            value={new Date(date)}
            mode="date"
            onChange={(_, selected) => {
              setShowDatePicker(Platform.OS === "ios");
              if (selected) setDate(selected.toISOString().slice(0, 10));
            }}
          />
        ) : null}

        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.secondary, marginBottom: 8 }}>
          Next due date
        </Text>
        <TouchableOpacity
          onPress={() => setShowDuePicker(true)}
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: theme.foreground }}>
            {nextDueDate ? new Date(nextDueDate).toLocaleDateString() : "Not set"}
          </Text>
        </TouchableOpacity>
        {showDuePicker ? (
          <DateTimePicker
            value={nextDueDate ? new Date(nextDueDate) : new Date()}
            mode="date"
            onChange={(_, selected) => {
              setShowDuePicker(Platform.OS === "ios");
              if (selected) setNextDueDate(selected.toISOString().slice(0, 10));
            }}
          />
        ) : null}

        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.secondary, marginBottom: 8 }}>
          Clinic (optional)
        </Text>
        <TextInput
          value={clinicName}
          onChangeText={setClinicName}
          placeholder="Clinic name"
          placeholderTextColor={theme.secondary}
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            padding: 14,
            color: theme.foreground,
            marginBottom: 16,
          }}
        />

        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.secondary, marginBottom: 8 }}>
          Notes (optional)
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Additional notes"
          placeholderTextColor={theme.secondary}
          multiline
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            padding: 14,
            color: theme.foreground,
            minHeight: 80,
            marginBottom: 24,
            textAlignVertical: "top",
          }}
        />

        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={{
            backgroundColor: theme.primary,
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: "center",
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>Save vaccination</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
