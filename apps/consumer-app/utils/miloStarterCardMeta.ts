import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

export type MiloStarterIoniconName = ComponentProps<typeof Ionicons>["name"];

export type MiloStarterCardMeta = {
  icon: MiloStarterIoniconName;
  iconBg: string;
  iconColor: string;
};

const FALLBACK_PALETTE: MiloStarterCardMeta[] = [
  { icon: "pulse-outline", iconBg: "rgba(84,186,183,0.14)", iconColor: "#54BAB7" },
  { icon: "cloud-upload-outline", iconBg: "rgba(91,155,232,0.14)", iconColor: "#8AB6F0" },
  { icon: "medkit-outline", iconBg: "rgba(91,201,140,0.14)", iconColor: "#7FD9A6" },
  { icon: "volume-medium-outline", iconBg: "rgba(167,139,250,0.14)", iconColor: "#C4B5FD" },
];

type CategoryRule = {
  re: RegExp;
  meta: MiloStarterCardMeta;
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    re: /\b(upload|document|invoice|insurance|pdf|passport|vault|lab|medication record)\b/i,
    meta: {
      icon: "cloud-upload-outline",
      iconBg: "rgba(91,155,232,0.14)",
      iconColor: "#8AB6F0",
    },
  },
  {
    re: /\b(health record|vaccination|vet visit|routine vet|clinical|exam|hub screen)\b/i,
    meta: {
      icon: "pulse-outline",
      iconBg: "rgba(84,186,183,0.14)",
      iconColor: "#54BAB7",
    },
  },
  {
    re: /\b(calm|noise|stress|anxiety|travel|exercise|food label|unsafe)\b/i,
    meta: {
      icon: "volume-medium-outline",
      iconBg: "rgba(167,139,250,0.14)",
      iconColor: "#C4B5FD",
    },
  },
  {
    re: /\b(how do i|how to|what is on|where do i|pawbuck|family sharing|transfer|subscription|plan)\b/i,
    meta: {
      icon: "help-circle-outline",
      iconBg: "rgba(232,162,61,0.14)",
      iconColor: "#E8A23D",
    },
  },
  {
    re: /\b(vet|vaccine|limping|symptom|medication|medicine)\b/i,
    meta: {
      icon: "medkit-outline",
      iconBg: "rgba(91,201,140,0.14)",
      iconColor: "#7FD9A6",
    },
  },
];

export function getMiloStarterCardMeta(prompt: string, index: number): MiloStarterCardMeta {
  const text = prompt.trim();
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(text)) {
      return rule.meta;
    }
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length]!;
}
