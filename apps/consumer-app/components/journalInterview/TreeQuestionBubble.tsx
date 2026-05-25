import type { JournalCurrentQuestion } from "@/types/journalInterview";
import { useTheme } from "@/context/themeContext";
import React, { useMemo, useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

const SYMPTOM_CHIP_IDS = new Set([
  "limp_stiff",
  "tired_faster",
  "vomit_after",
  "lethargic",
  "refused",
]);

type Props = {
  question: JournalCurrentQuestion;
  onAnswer: (message: string, chipIds: string[]) => void;
  onSwitchToSymptom?: () => void;
  disabled?: boolean;
};

export function TreeQuestionBubble({
  question,
  onAnswer,
  onSwitchToSymptom,
  disabled,
}: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const [twoStage, setTwoStage] = useState<1 | 2>(1);
  const [stage1Ids, setStage1Ids] = useState<string[]>([]);
  const [multiIds, setMultiIds] = useState<string[]>([]);
  const [drilldown, setDrilldown] = useState<{
    chipId: string;
    label: string;
    prompt: string;
  } | null>(null);
  const [drilldownText, setDrilldownText] = useState("");

  const showSymptomBanner = useMemo(() => {
    const ids = [...multiIds, ...stage1Ids];
    return ids.some((id) => SYMPTOM_CHIP_IDS.has(id));
  }, [multiIds, stage1Ids]);

  const chipStyle = (active: boolean) => ({
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: active ? theme.primary : isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
    backgroundColor: active ? `${theme.primary}22` : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
  });

  const pickOption = (opt: { id: string; label: string; drilldownPrompt?: string }) => {
    if (opt.drilldownPrompt) {
      setDrilldown({ chipId: opt.id, label: opt.label, prompt: opt.drilldownPrompt });
      setDrilldownText("");
      return;
    }
    if (question.type === "multi") {
      setMultiIds((prev) =>
        prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id]
      );
      return;
    }
    if (question.type === "two_stage" && twoStage === 1) {
      setStage1Ids([opt.id]);
      setTwoStage(2);
      return;
    }
    if (question.type === "two_stage" && twoStage === 2 && stage1Ids.length > 0) {
      const stage1Label =
        question.stage1Options?.find((o) => o.id === stage1Ids[0])?.label ?? "";
      const combined = stage1Label ? `${stage1Label} · ${opt.label}` : opt.label;
      onAnswer(combined, [...stage1Ids, opt.id]);
      return;
    }
    onAnswer(opt.label, [opt.id]);
  };

  const submitMulti = () => {
    if (multiIds.length === 0) return;
    const labels = question.options
      .filter((o) => multiIds.includes(o.id))
      .map((o) => o.label)
      .join(", ");
    onAnswer(labels, multiIds);
  };

  const options =
    question.type === "two_stage"
      ? twoStage === 1
        ? question.stage1Options ?? []
        : question.stage2Options ?? []
      : question.options;

  return (
    <View style={{ marginLeft: 56, marginBottom: 12, maxWidth: "92%" }}>
      {showSymptomBanner && onSwitchToSymptom ? (
        <TouchableOpacity
          onPress={onSwitchToSymptom}
          style={{
            padding: 10,
            borderRadius: 10,
            backgroundColor: "rgba(245,158,11,0.15)",
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#b45309" }}>
            Sounds like a symptom — switch to symptom check-in
          </Text>
        </TouchableOpacity>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {options.map((opt) => {
            const active =
              question.type === "multi"
                ? multiIds.includes(opt.id)
                : stage1Ids.includes(opt.id);
            return (
              <TouchableOpacity
                key={opt.id}
                disabled={disabled}
                onPress={() => pickOption(opt)}
                style={chipStyle(active)}
              >
                <Text style={{ fontSize: 14, color: theme.foreground }}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            disabled={disabled}
            onPress={() => onAnswer("Not sure", ["not_sure"])}
            style={chipStyle(false)}
          >
            <Text style={{ fontSize: 14, color: theme.foreground }}>Not sure</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {question.type === "multi" ? (
        <TouchableOpacity
          disabled={disabled || multiIds.length === 0}
          onPress={submitMulti}
          style={{
            marginTop: 8,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: theme.primary,
            alignItems: "center",
            opacity: multiIds.length === 0 ? 0.5 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Continue</Text>
        </TouchableOpacity>
      ) : null}

      {question.type === "two_stage" && twoStage === 2 && stage1Ids.length > 0 ? (
        <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 6 }}>
          Pick a follow-up option above
        </Text>
      ) : null}

      <Modal visible={drilldown != null} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text style={{ fontWeight: "700", color: theme.foreground, marginBottom: 8 }}>
              {drilldown?.label}
            </Text>
            <Text style={{ color: theme.secondary, marginBottom: 10 }}>{drilldown?.prompt}</Text>
            <TextInput
              value={drilldownText}
              onChangeText={setDrilldownText}
              placeholder="Add details"
              placeholderTextColor={theme.secondary}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 8,
                padding: 10,
                color: theme.foreground,
                marginBottom: 12,
              }}
            />
            <TouchableOpacity
              onPress={() => {
                if (!drilldown) return;
                const msg = drilldownText.trim() || drilldown.label;
                onAnswer(msg, [drilldown.chipId]);
                setDrilldown(null);
              }}
              style={{
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: theme.primary,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
