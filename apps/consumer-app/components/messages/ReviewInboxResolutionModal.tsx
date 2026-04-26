import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import type { FailedEmail } from "@/services/failedEmails";
import {
  resolveReviewInboxEmail,
  type ReviewInboxDocumentPipelineType,
} from "@/utils/mailResolveApi";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  UIManager,
  View,
} from "react-native";

const DOC_OPTIONS: { value: ReviewInboxDocumentPipelineType; label: string }[] = [
  { value: "vaccinations", label: "Vaccine" },
  { value: "medications", label: "Medication" },
  { value: "lab_results", label: "Lab" },
  { value: "clinical_exams", label: "Clinical visit" },
];

type Props = {
  visible: boolean;
  item: FailedEmail | null;
  onClose: () => void;
  onResolved: (petName: string, docLabel: string) => void;
  onViewDetails?: () => void;
};

export default function ReviewInboxResolutionModal({
  visible,
  item,
  onClose,
  onResolved,
  onViewDetails,
}: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { pets } = usePets();
  const [petId, setPetId] = useState<string | null>(null);
  const [docType, setDocType] = useState<ReviewInboxDocumentPipelineType>("vaccinations");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item?.pet_id) {
      setPetId(item.pet_id);
    } else if (pets.length > 0) {
      setPetId(pets[0].id);
    } else {
      setPetId(null);
    }
    setDocType("vaccinations");
  }, [item, pets]);

  const petName = useMemo(() => {
    if (!petId) return "your pet";
    return pets.find((p) => p.id === petId)?.name ?? item?.pets?.name ?? "your pet";
  }, [petId, pets, item?.pets?.name]);

  const docLabel = useMemo(
    () => DOC_OPTIONS.find((d) => d.value === docType)?.label ?? "record",
    [docType]
  );

  const handleConfirm = async () => {
    if (!item || !petId) {
      Alert.alert("Select a pet", "Choose which pet this document is for.");
      return;
    }
    setSubmitting(true);
    try {
      await resolveReviewInboxEmail({
        emailId: item.id,
        selectedPetId: petId,
        selectedDocType: docType,
      });
      if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onResolved(petName, docLabel);
      onClose();
    } catch (e) {
      Alert.alert(
        "Could not file record",
        e instanceof Error ? e.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <View
          className="rounded-t-3xl px-4 pt-4 pb-8"
          style={{
            backgroundColor: theme.card,
            maxHeight: "88%",
          }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.foreground }}>
              Review &amp; sort
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.secondary} />
            </Pressable>
          </View>

          <Text
            style={{
              fontSize: 14,
              color: theme.secondary,
              marginBottom: 16,
              lineHeight: 20,
            }}
          >
            Milo found these documents. Please help us sort them to the right pet.
          </Text>

          {item.subject ? (
            <Text
              style={{ fontSize: 13, color: theme.secondary, marginBottom: 12 }}
              numberOfLines={2}
            >
              {item.subject}
            </Text>
          ) : null}

          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground, marginBottom: 8 }}>
            Which pet is this for?
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}
          >
            {pets.map((p) => {
              const selected = petId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPetId(p.id)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: selected ? theme.primary : (isDark ? "rgba(255,255,255,0.06)" : theme.background),
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "600",
                      color: selected ? theme.primaryForeground : theme.foreground,
                    }}
                  >
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground, marginBottom: 8 }}>
            What type of document is this?
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {DOC_OPTIONS.map((d) => {
              const selected = docType === d.value;
              return (
                <Pressable
                  key={d.value}
                  onPress={() => setDocType(d.value)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: selected ? theme.primary : (isDark ? "rgba(255,255,255,0.06)" : theme.background),
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "600",
                      fontSize: 13,
                      color: selected ? theme.primaryForeground : theme.foreground,
                    }}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {onViewDetails ? (
            <Pressable onPress={onViewDetails} className="mb-3">
              <Text style={{ color: theme.primary, fontWeight: "600", fontSize: 14 }}>
                View full details
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleConfirm}
            disabled={submitting || !petId}
            style={{
              backgroundColor: theme.primary,
              opacity: submitting || !petId ? 0.6 : 1,
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            {submitting ? (
              <ActivityIndicator color={theme.primaryForeground} />
            ) : (
              <Text style={{ color: theme.primaryForeground, fontWeight: "700", fontSize: 16 }}>
                Confirm
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
