import { EmergencyBanner } from "@/components/journalInterview/EmergencyBanner";
import { useTheme } from "@/context/themeContext";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type Props = {
  petName: string;
  emergency: boolean;
  showAdrNote?: boolean;
  onViewJournal: () => void;
  onShareVet: () => void;
  onFindErVet?: () => void;
};

export function PostSaveHandoff({
  petName,
  emergency,
  showAdrNote,
  onViewJournal,
  onShareVet,
  onFindErVet,
}: Props) {
  const { theme } = useTheme();

  return (
    <View style={{ marginLeft: 56, marginBottom: 12, gap: 8, maxWidth: "92%" }}>
      {emergency ? <EmergencyBanner showAdrNote={showAdrNote} /> : null}
      {emergency && onFindErVet ? (
        <TouchableOpacity
          onPress={onFindErVet}
          style={{
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: "#dc2626",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Find a 24h vet near you</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        onPress={onShareVet}
        style={{
          paddingVertical: 12,
          borderRadius: 10,
          backgroundColor: theme.primary,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Share with {petName}&apos;s vet</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onViewJournal}
        style={{
          paddingVertical: 12,
          borderRadius: 10,
          backgroundColor: "rgba(0,0,0,0.06)",
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.foreground, fontWeight: "600" }}>Saved to Journal · View</Text>
      </TouchableOpacity>
    </View>
  );
}
