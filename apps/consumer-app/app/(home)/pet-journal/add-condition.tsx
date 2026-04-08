import { useTheme } from "@/context/themeContext";
import { createPetCondition } from "@/services/petJournal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STATUSES = [
  { id: "active", label: "Active" },
  { id: "suspected", label: "Suspected" },
  { id: "resolved", label: "Resolved" },
] as const;

export default function AddConditionScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"active" | "suspected" | "resolved">("active");

  const mutation = useMutation({
    mutationFn: () =>
      createPetCondition({
        pet_id: petId!,
        name: name.trim(),
        notes: notes.trim() || null,
        status,
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
        <Text style={{ fontSize: 17, fontWeight: "700", color: theme.foreground }}>Add condition</Text>
        <View style={{ width: 56 }} />
      </View>
      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        <TextInput
          placeholder="Condition name"
          placeholderTextColor={theme.secondary}
          value={name}
          onChangeText={setName}
          style={{
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
            borderRadius: 12,
            padding: 14,
            fontSize: 16,
            color: theme.foreground,
          }}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {STATUSES.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => setStatus(s.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 100,
                backgroundColor: status === s.id ? theme.primary : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              }}
            >
              <Text style={{ color: status === s.id ? "#FFF" : theme.foreground, fontWeight: "600" }}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
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
            if (!name.trim()) {
              Alert.alert("Name required");
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
