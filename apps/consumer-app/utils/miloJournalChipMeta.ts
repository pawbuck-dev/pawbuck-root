import type { MiloStarterCardMeta, MiloStarterIoniconName } from "./miloStarterCardMeta";

const JOURNAL_TOPIC_RULES: { re: RegExp; meta: MiloStarterCardMeta }[] = [
  {
    re: /^\+\s*add details$/i,
    meta: { icon: "create-outline", iconBg: "rgba(84,186,183,0.14)", iconColor: "#54BAB7" },
  },
  {
    re: /\b(looks right|save|confirm summary|edit summary)\b/i,
    meta: { icon: "document-text-outline", iconBg: "rgba(84,186,183,0.14)", iconColor: "#54BAB7" },
  },
  {
    re: /\b(none of these|nothing else|nothing different)\b/i,
    meta: { icon: "checkmark-circle-outline", iconBg: "rgba(91,201,140,0.14)", iconColor: "#7FD9A6" },
  },
  {
    re: /^none$/i,
    meta: { icon: "checkmark-circle-outline", iconBg: "rgba(91,201,140,0.14)", iconColor: "#7FD9A6" },
  },
  {
    re: /\b(emergency|red flag|very weak|pale|white gum|bloated|can.t keep water)\b/i,
    meta: { icon: "alert-circle-outline", iconBg: "rgba(239,68,68,0.14)", iconColor: "#F87171" },
  },
  {
    re: /\b(blood|coffee-ground|black\/tarry|red blood)\b/i,
    meta: { icon: "water-outline", iconBg: "rgba(239,68,68,0.14)", iconColor: "#F87171" },
  },
  {
    re: /\bjust (started )?today\b/i,
    meta: { icon: "today-outline", iconBg: "rgba(91,201,140,0.14)", iconColor: "#7FD9A6" },
  },
  {
    re: /\b(started )?yesterday\b/i,
    meta: { icon: "moon-outline", iconBg: "rgba(167,139,250,0.14)", iconColor: "#C4B5FD" },
  },
  {
    re: /\b(a couple of days|1[-–]2 days|2[-–]3 days)\b/i,
    meta: { icon: "time-outline", iconBg: "rgba(96,165,250,0.14)", iconColor: "#93C5FD" },
  },
  {
    re: /\b(about a week|on and off|week\+?)\b/i,
    meta: { icon: "calendar-outline", iconBg: "rgba(232,162,61,0.14)", iconColor: "#E8A23D" },
  },
  {
    re: /\b(longer than|gradual|month)\b/i,
    meta: { icon: "hourglass-outline", iconBg: "rgba(148,163,184,0.18)", iconColor: "#CBD5E1" },
  },
  {
    re: /^once$/i,
    meta: { icon: "ellipse-outline", iconBg: "rgba(148,163,184,0.14)", iconColor: "#94A3B8" },
  },
  {
    re: /\b(2[-–]3 times?|2[-–]3)\b/i,
    meta: { icon: "repeat-outline", iconBg: "rgba(96,165,250,0.14)", iconColor: "#93C5FD" },
  },
  {
    re: /\b(4[-–]6|many times)\b/i,
    meta: { icon: "pulse-outline", iconBg: "rgba(249,115,22,0.14)", iconColor: "#FB923C" },
  },
  {
    re: /\ball good\b/i,
    meta: { icon: "checkmark-circle-outline", iconBg: "rgba(91,201,140,0.14)", iconColor: "#7FD9A6" },
  },
  {
    re: /\b(vomit|diarrhea|digestive)\b/i,
    meta: { icon: "medkit-outline", iconBg: "rgba(249,115,22,0.14)", iconColor: "#FB923C" },
  },
  {
    re: /^both$/i,
    meta: { icon: "layers-outline", iconBg: "rgba(96,165,250,0.14)", iconColor: "#93C5FD" },
  },
  {
    re: /\b(letharg|tired|energy|barely moving|much less active|a little off|hiding|sleeping more)\b/i,
    meta: { icon: "moon-outline", iconBg: "rgba(167,139,250,0.14)", iconColor: "#C4B5FD" },
  },
  {
    re: /\b(off food|won.t eat|not eating|eating less|picky|eats slowly|treats only)\b/i,
    meta: { icon: "restaurant-outline", iconBg: "rgba(249,115,22,0.14)", iconColor: "#FB923C" },
  },
  {
    re: /\b(eating more|asking for food|hungry|stealing food|pica)\b/i,
    meta: { icon: "nutrition-outline", iconBg: "rgba(232,162,61,0.14)", iconColor: "#E8A23D" },
  },
  {
    re: /\b(appetite|changed appetite)\b/i,
    meta: { icon: "restaurant-outline", iconBg: "rgba(232,162,61,0.14)", iconColor: "#E8A23D" },
  },
  {
    re: /^food$/i,
    meta: { icon: "fast-food-outline", iconBg: "rgba(232,162,61,0.14)", iconColor: "#E8A23D" },
  },
  {
    re: /\b(new food|new treat|table scrap|feeding change|new feeder)\b/i,
    meta: { icon: "fast-food-outline", iconBg: "rgba(232,162,61,0.14)", iconColor: "#E8A23D" },
  },
  {
    re: /\b(yellow bile|bile)\b/i,
    meta: { icon: "color-fill-outline", iconBg: "rgba(232,162,61,0.14)", iconColor: "#E8A23D" },
  },
  {
    re: /\b(foam|watery|soft|pudding|mucus)\b/i,
    meta: { icon: "water-outline", iconBg: "rgba(96,165,250,0.14)", iconColor: "#93C5FD" },
  },
  {
    re: /\bdrinking (more|less|normally)\b/i,
    meta: { icon: "water-outline", iconBg: "rgba(96,165,250,0.14)", iconColor: "#93C5FD" },
  },
  {
    re: /\b(eating normally|drinking normally|normal energy|^normal$)\b/i,
    meta: { icon: "checkmark-circle-outline", iconBg: "rgba(91,201,140,0.14)", iconColor: "#7FD9A6" },
  },
  {
    re: /\b(scratch|itch)\b/i,
    meta: { icon: "hand-left-outline", iconBg: "rgba(244,114,182,0.14)", iconColor: "#F472B6" },
  },
  {
    re: /\blimp/i,
    meta: { icon: "walk-outline", iconBg: "rgba(96,165,250,0.14)", iconColor: "#93C5FD" },
  },
  {
    re: /\bcough/i,
    meta: { icon: "fitness-outline", iconBg: "rgba(148,163,184,0.18)", iconColor: "#CBD5E1" },
  },
  {
    re: /\bbelly\b/i,
    meta: { icon: "body-outline", iconBg: "rgba(249,115,22,0.14)", iconColor: "#FB923C" },
  },
  {
    re: /^eye$/i,
    meta: { icon: "eye-outline", iconBg: "rgba(84,186,183,0.14)", iconColor: "#54BAB7" },
  },
  {
    re: /^ear$/i,
    meta: { icon: "ear-outline", iconBg: "rgba(167,139,250,0.14)", iconColor: "#C4B5FD" },
  },
  {
    re: /\b(eye or ear|eye\/ear)\b/i,
    meta: { icon: "eye-outline", iconBg: "rgba(84,186,183,0.14)", iconColor: "#54BAB7" },
  },
  {
    re: /\b(stress|travel|move|boarding)\b/i,
    meta: { icon: "airplane-outline", iconBg: "rgba(148,163,184,0.14)", iconColor: "#94A3B8" },
  },
  {
    re: /\b(got into|weight loss|weight gain|dental|bad breath)\b/i,
    meta: { icon: "medkit-outline", iconBg: "rgba(84,186,183,0.14)", iconColor: "#54BAB7" },
  },
  {
    re: /\bnot sure\b/i,
    meta: { icon: "help-circle-outline", iconBg: "rgba(148,163,184,0.14)", iconColor: "#94A3B8" },
  },
];

const JOURNAL_FALLBACK: MiloStarterCardMeta[] = [
  { icon: "clipboard-outline", iconBg: "rgba(84,186,183,0.14)", iconColor: "#54BAB7" },
  { icon: "list-outline", iconBg: "rgba(96,165,250,0.14)", iconColor: "#93C5FD" },
  { icon: "chatbox-ellipses-outline", iconBg: "rgba(148,163,184,0.14)", iconColor: "#94A3B8" },
];

export function getMiloJournalChipMeta(label: string, index: number): MiloStarterCardMeta {
  const text = label.trim();
  for (const rule of JOURNAL_TOPIC_RULES) {
    if (rule.re.test(text)) {
      return rule.meta;
    }
  }
  return JOURNAL_FALLBACK[index % JOURNAL_FALLBACK.length]!;
}

export type { MiloStarterIoniconName };
