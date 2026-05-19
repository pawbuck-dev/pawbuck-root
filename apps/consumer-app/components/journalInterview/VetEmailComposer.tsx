import { useTheme } from "@/context/themeContext";
import { getCareTeamMembersForPet } from "@/services/careTeamMembers";
import type { VetAskKind } from "@/utils/buildVetMessageFromJournalSession";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ASK_OPTIONS: { id: VetAskKind; label: string; subtitle: string }[] = [
  { id: "fyi", label: "FYI", subtitle: "Routine update for their records" },
  { id: "advise", label: "Please advise", subtitle: "You want guidance within a day or two" },
  { id: "urgent", label: "Urgent", subtitle: "Needs attention soon — not a 911 substitute" },
];

type Props = {
  visible: boolean;
  petId: string;
  petName: string;
  onClose: () => void;
  onConfirm: (ask: VetAskKind, recipientEmail?: string) => void;
};

export function VetEmailComposer({ visible, petId, petName, onClose, onConfirm }: Props) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<VetAskKind>("fyi");
  const [recipientEmail, setRecipientEmail] = useState<string | undefined>();

  const { data: careTeam = [], isLoading } = useQuery({
    queryKey: ["careTeam", petId],
    queryFn: () => getCareTeamMembersForPet(petId),
    enabled: visible && !!petId,
  });

  const vets = careTeam.filter(
    (m) => m.type === "veterinarian" && typeof m.email === "string" && m.email.trim().length > 0
  );

  useEffect(() => {
    if (!visible) return;
    const primary = vets[0]?.email?.trim();
    setRecipientEmail(primary || undefined);
  }, [visible, vets]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: theme.card,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 20,
            paddingBottom: 32,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.foreground, marginBottom: 4 }}>
            Share with {petName}&apos;s vet
          </Text>
          <Text style={{ fontSize: 14, color: theme.secondary, marginBottom: 16 }}>
            How should your clinic prioritize this message?
          </Text>
          {isLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginBottom: 12 }} />
          ) : vets.length > 0 ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground, marginBottom: 8 }}>
                Send to
              </Text>
              {vets.map((v) => {
                const email = v.email!.trim();
                const active = recipientEmail === email;
                return (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => setRecipientEmail(email)}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      marginBottom: 6,
                      borderWidth: 2,
                      borderColor: active ? theme.primary : theme.border,
                    }}
                  >
                    <Text style={{ fontWeight: "600", color: theme.foreground }}>
                      {v.clinic_name || v.vet_name || "Veterinarian"}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.secondary }}>{email}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: theme.secondary, marginBottom: 12 }}>
              No vet on your care team yet — you can pick a recipient on the next screen.
            </Text>
          )}
          {ASK_OPTIONS.map((opt) => {
            const active = selected === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setSelected(opt.id)}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  marginBottom: 8,
                  borderWidth: 2,
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? `${theme.primary}18` : "transparent",
                }}
              >
                <Text style={{ fontWeight: "700", color: theme.foreground }}>{opt.label}</Text>
                <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 2 }}>{opt.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => onConfirm(selected, recipientEmail)}
            style={{
              marginTop: 8,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: theme.primary,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Continue to message</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12, alignItems: "center" }}>
            <Text style={{ color: theme.secondary }}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
