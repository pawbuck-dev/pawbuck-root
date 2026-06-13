import type { MiloStarterCardMeta, MiloStarterIoniconName } from "./miloStarterCardMeta";

const C = {
  green: { iconBg: "rgba(91,201,140,0.14)", iconColor: "#7FD9A6" },
  teal: { iconBg: "rgba(84,186,183,0.14)", iconColor: "#54BAB7" },
  blue: { iconBg: "rgba(96,165,250,0.14)", iconColor: "#93C5FD" },
  purple: { iconBg: "rgba(167,139,250,0.14)", iconColor: "#C4B5FD" },
  amber: { iconBg: "rgba(232,162,61,0.14)", iconColor: "#E8A23D" },
  orange: { iconBg: "rgba(249,115,22,0.14)", iconColor: "#FB923C" },
  pink: { iconBg: "rgba(244,114,182,0.14)", iconColor: "#F472B6" },
  red: { iconBg: "rgba(239,68,68,0.14)", iconColor: "#F87171" },
  slate: { iconBg: "rgba(148,163,184,0.18)", iconColor: "#CBD5E1" },
  gray: { iconBg: "rgba(148,163,184,0.14)", iconColor: "#94A3B8" },
} as const;

function chip(icon: MiloStarterIoniconName, palette: (typeof C)[keyof typeof C]): MiloStarterCardMeta {
  return { icon, iconBg: palette.iconBg, iconColor: palette.iconColor };
}

/** Known journal reply labels — checked before fuzzy rules. */
const JOURNAL_EXACT_LABELS: Record<string, MiloStarterCardMeta> = {
  "+ add details": chip("create-outline", C.teal),
  "all good today": chip("checkmark-circle-outline", C.green),
  "vomiting or diarrhea": chip("medkit-outline", C.orange),
  "lethargic today": chip("moon-outline", C.purple),
  "changed appetite": chip("restaurant-outline", C.amber),
  "scratching a lot": chip("hand-left-outline", C.pink),
  limping: chip("walk-outline", C.blue),
  coughing: chip("cloud-outline", C.slate),
  "eye or ear issue": chip("medical-outline", C.teal),
  "not sure": chip("help-circle-outline", C.gray),
  "looks right — save": chip("document-text-outline", C.teal),
  "nothing else": chip("checkmark-circle-outline", C.green),
  "nothing different": chip("checkmark-circle-outline", C.green),
  "none of these": chip("checkmark-circle-outline", C.green),
  none: chip("checkmark-circle-outline", C.green),
  both: chip("layers-outline", C.blue),
  vomiting: chip("medkit-outline", C.orange),
  diarrhea: chip("water-outline", C.blue),
  "more tired": chip("moon-outline", C.purple),
  "a little off": chip("battery-half-outline", C.amber),
  "much less active": chip("moon-outline", C.purple),
  "barely moving": chip("bed-outline", C.red),
  "a little quiet": chip("battery-half-outline", C.amber),
  "noticeably tired": chip("moon-outline", C.purple),
  "won't get up much": chip("bed-outline", C.red),
  "barely responsive": chip("alert-circle-outline", C.red),
  "yes, just tired": chip("moon-outline", C.purple),
  "less interested than usual": chip("remove-circle-outline", C.amber),
  withdrawn: chip("eye-off-outline", C.purple),
  "doesn't recognize routine cues": chip("help-circle-outline", C.red),
  eye: chip("eye-outline", C.teal),
  ear: chip("ear-outline", C.purple),
  normal: chip("checkmark-circle-outline", C.green),
  "eating less": chip("restaurant-outline", C.orange),
  "not eating": chip("close-circle-outline", C.orange),
  "drinking more": chip("water-outline", C.blue),
  food: chip("fast-food-outline", C.amber),
  "yellow bile": chip("color-fill-outline", C.amber),
  foam: chip("water-outline", C.blue),
  "just started today": chip("today-outline", C.green),
  "started yesterday": chip("moon-outline", C.purple),
  "a couple of days": chip("time-outline", C.blue),
  "about a week": chip("calendar-outline", C.amber),
  "on and off": chip("calendar-outline", C.amber),
  "just today": chip("today-outline", C.green),
  "1–2 days": chip("time-outline", C.blue),
  once: chip("ellipse-outline", C.gray),
};

const JOURNAL_TOPIC_RULES: { re: RegExp; meta: MiloStarterCardMeta }[] = [
  {
    re: /\b(looks right|save|confirm summary|edit summary)\b/i,
    meta: chip("document-text-outline", C.teal),
  },
  {
    re: /\b(emergency|red flag|very weak|pale|white gum|bloated|can.t keep water)\b/i,
    meta: chip("alert-circle-outline", C.red),
  },
  {
    re: /\b(blood|coffee-ground|black\/tarry|red blood)\b/i,
    meta: chip("water-outline", C.red),
  },
  {
    re: /\bjust (started )?today\b/i,
    meta: chip("today-outline", C.green),
  },
  {
    re: /\b(started )?yesterday\b/i,
    meta: chip("moon-outline", C.purple),
  },
  {
    re: /\b(a couple of days|1[-–]2 days|2[-–]3 days)\b/i,
    meta: chip("time-outline", C.blue),
  },
  {
    re: /\b(about a week|on and off|week\+?)\b/i,
    meta: chip("calendar-outline", C.amber),
  },
  {
    re: /\b(longer than|gradual|month)\b/i,
    meta: chip("hourglass-outline", C.slate),
  },
  {
    re: /\b(2[-–]3 times?|2[-–]3)\b/i,
    meta: chip("repeat-outline", C.blue),
  },
  {
    re: /\b(4[-–]6|many times)\b/i,
    meta: chip("pulse-outline", C.orange),
  },
  {
    re: /\ball good\b/i,
    meta: chip("checkmark-circle-outline", C.green),
  },
  {
    re: /vomit|diarr/i,
    meta: chip("medkit-outline", C.orange),
  },
  {
    re: /letharg|low.?energy|sleeping more|tired faster/i,
    meta: chip("moon-outline", C.purple),
  },
  {
    re: /scratch|itch|chewing paw|scooting|hot spot|dandruff|flea dirt|hair loss/i,
    meta: chip("hand-left-outline", C.pink),
  },
  {
    re: /cough|sneez|wheez|breathing diff/i,
    meta: chip("cloud-outline", C.slate),
  },
  {
    re: /limp|stiff|three.?leg|dragging leg/i,
    meta: chip("walk-outline", C.blue),
  },
  {
    re: /eye or ear|eye\/ear|\beye\b|\bear\b/i,
    meta: chip("medical-outline", C.teal),
  },
  {
    re: /off food|won.t eat|not eating|eating less|picky|appetite|changed appetite/i,
    meta: chip("restaurant-outline", C.orange),
  },
  {
    re: /eating more|asking for food|hungry|stealing food|pica/i,
    meta: chip("nutrition-outline", C.amber),
  },
  {
    re: /\bfood\b/i,
    meta: chip("fast-food-outline", C.amber),
  },
  {
    re: /yellow bile|\bbile\b/i,
    meta: chip("color-fill-outline", C.amber),
  },
  {
    re: /foam|watery|soft|pudding|mucus/i,
    meta: chip("water-outline", C.blue),
  },
  {
    re: /drinking (more|less|normally)|drinking less|drinking more/i,
    meta: chip("water-outline", C.blue),
  },
  {
    re: /eating normally|drinking normally|normal energy|^normal$/i,
    meta: chip("checkmark-circle-outline", C.green),
  },
  {
    re: /belly|swelling|wound|bleeding/i,
    meta: chip("body-outline", C.orange),
  },
  {
    re: /stress|travel|boarding|fireworks|thunder/i,
    meta: chip("airplane-outline", C.gray),
  },
  {
    re: /new food|new treat|table scrap|feeding change/i,
    meta: chip("fast-food-outline", C.amber),
  },
  {
    re: /not sure/i,
    meta: chip("help-circle-outline", C.gray),
  },
  {
    re: /nothing else|nothing different|none of these|^none$/i,
    meta: chip("checkmark-circle-outline", C.green),
  },
  {
    re: /\+?\s*add details/i,
    meta: chip("create-outline", C.teal),
  },
];

const JOURNAL_FALLBACK: MiloStarterCardMeta[] = [
  chip("clipboard-outline", C.teal),
  chip("chatbox-ellipses-outline", C.gray),
  chip("list-outline", C.blue),
];

function normalizeJournalLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getMiloJournalChipMeta(label: string, index: number): MiloStarterCardMeta {
  const text = label.trim();
  const exact = JOURNAL_EXACT_LABELS[normalizeJournalLabel(text)];
  if (exact) {
    return exact;
  }

  for (const rule of JOURNAL_TOPIC_RULES) {
    if (rule.re.test(text)) {
      return rule.meta;
    }
  }

  return JOURNAL_FALLBACK[index % JOURNAL_FALLBACK.length]!;
}

export type { MiloStarterIoniconName };
