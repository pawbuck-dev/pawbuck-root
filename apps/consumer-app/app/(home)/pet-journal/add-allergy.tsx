import { useTheme } from "@/context/themeContext";
import { createPetAllergy } from "@/services/petJournal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AddAllergyScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createPetAllergy({
        pet_id: petId!,
        label: label.trim(),
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health_briefing", petId] });
      router.back();
    },
    onError: (e: unknown) => {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not save");
    },
  });

  if (!petId) {
    return null;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 16,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.primary, fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "700", color: theme.foreground }}>Add allergy</Text>
        <View style={{ width: 56 }} />
      </View>
      <View style={{ paddingHorizontal: 16, gap: 16 }}>
        <TextInput
          placeholder="e.g. Chicken protein"
          placeholderTextColor={theme.secondary}
          value={label}
          onChangeText={setLabel}
          style={{
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
            borderRadius: 12,
            padding: 14,
            fontSize: 16,
            color: theme.foreground,
          }}
        />
        <TextInput
          placeholder="Notes (optional)"
          placeholderTextColor={theme.secondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          style={{
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
            borderRadius: 12,
            padding: 14,
            fontSize: 16,
            color: theme.foreground,
            minHeight: 80,
            textAlignVertical: "top",
          }}
        />
        <TouchableOpacity
          onPress={() => {
            if (!label.trim()) {
              Alert.alert("Label required");
              return;
            }
            mutation.mutate();
          }}
          disabled={mutation.isPending}
          style={{
            backgroundColor: theme.primary,
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
