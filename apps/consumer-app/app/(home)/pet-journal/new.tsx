import {
  JOURNAL_DOMAIN_LABEL,
  subtypesForDomain,
  type JournalDomain,
} from "@/constants/petJournal";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { createJournalEntry } from "@/services/petJournal";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DOMAINS: JournalDomain[] = ["health", "behavioral", "environmental"];

export default function PetJournalNewScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { pets } = usePets();
  const { petId, domain: domainParam } = useLocalSearchParams<{
    petId?: string;
    domain?: string;
  }>();

  const initialDomain = useMemo(() => {
    const d = domainParam as JournalDomain | undefined;
    if (d && DOMAINS.includes(d)) return d;
    return "health" as JournalDomain;
  }, [domainParam]);

  const [domain, setDomain] = useState<JournalDomain>(initialDomain);
  const [subtype, setSubtype] = useState<string>(
    subtypesForDomain(initialDomain)[0].id
  );
  const [note, setNote] = useState("");
  const [vetFlagged, setVetFlagged] = useState(false);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));

  const pet = pets.find((p) => p.id === petId);

  const mutation = useMutation({
    mutationFn: () =>
      createJournalEntry({
        pet_id: petId!,
        domain,
        subtype,
        note: note.trim() || null,
        vet_flagged: domain === "health" ? vetFlagged : false,
        entry_date: entryDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pet_journal"] });
      queryClient.invalidateQueries({ queryKey: ["health_briefing"] });
      router.back();
    },
    onError: (e: unknown) => {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
    },
  });

  const subtypes = subtypesForDomain(domain);

  const onDomainChange = (d: JournalDomain) => {
    setDomain(d);
    const first = subtypesForDomain(d)[0].id;
    setSubtype(first);
    if (d !== "health") setVetFlagged(false);
  };

  if (!petId || !pet) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <Text style={{ color: theme.secondary }}>Missing pet</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
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
          paddingBottom: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={{ fontSize: 16, color: theme.primary }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "700", color: theme.foreground }}>New entry</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.secondary, marginBottom: 8 }}>
          Category
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {DOMAINS.map((d) => (
            <Pressable
              key={d}
              onPress={() => onDomainChange(d)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 100,
                backgroundColor:
                  domain === d
                    ? theme.primary
                    : isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.06)",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: domain === d ? "#FFFFFF" : theme.foreground,
                }}
              >
                {JOURNAL_DOMAIN_LABEL[d]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.secondary, marginBottom: 8 }}>
          Type
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {subtypes.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => setSubtype(s.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor:
                  subtype === s.id ? theme.primary : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                backgroundColor:
                  subtype === s.id
                    ? isDark
                      ? "rgba(59,208,210,0.15)"
                      : "rgba(59,208,210,0.12)"
                    : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: theme.foreground,
                }}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.secondary, marginBottom: 8 }}>
          Date
        </Text>
        <TextInput
          value={entryDate}
          onChangeText={setEntryDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.secondary}
          style={{
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
            borderRadius: 12,
            padding: 12,
            fontSize: 16,
            color: theme.foreground,
            marginBottom: 20,
          }}
        />

        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.secondary, marginBottom: 8 }}>
          Note (optional)
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What did you observe?"
          placeholderTextColor={theme.secondary}
          multiline
          style={{
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
            borderRadius: 12,
            padding: 12,
            fontSize: 16,
            color: theme.foreground,
            minHeight: 120,
            textAlignVertical: "top",
            marginBottom: 20,
          }}
        />

        {domain === "health" && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
              paddingVertical: 8,
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: theme.foreground }}>
                Flag for vet
              </Text>
              <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 4 }}>
                Highlights this symptom in Health Briefing
              </Text>
            </View>
            <Switch
              value={vetFlagged}
              onValueChange={setVetFlagged}
              trackColor={{ false: "#767577", true: theme.primary }}
            />
          </View>
        )}

        <TouchableOpacity
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
          style={{
            backgroundColor: theme.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>Save entry</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
