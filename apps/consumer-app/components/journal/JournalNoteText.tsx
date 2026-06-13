import { useTheme } from "@/context/themeContext";
import { humanizeRoutineJournalNote, stripUnspecifiedJournalFieldLines } from "@/utils/journalContinuity";
import React, { useMemo } from "react";
import { Text, View, type StyleProp, type TextStyle } from "react-native";

type ClinicalBadge = "URGENT" | "CRITICAL" | null;

function parseClinicalPrefix(raw: string): { badge: ClinicalBadge; body: string } {
  const trimmed = raw.trimStart();
  const critical = trimmed.match(/^\[CRITICAL\]\s*/i);
  if (critical) {
    return {
      badge: "CRITICAL",
      body: raw.trimStart().slice(critical[0].length).trimStart(),
    };
  }
  const urgent = trimmed.match(/^\[URGENT\]\s*/i);
  if (urgent) {
    return {
      badge: "URGENT",
      body: raw.trimStart().slice(urgent[0].length).trimStart(),
    };
  }
  return { badge: null, body: raw };
}

/** Split on **…** pairs; odd-index segments (1-based) are bold. */
function splitBoldSegments(line: string): { text: string; bold: boolean }[] {
  const parts = line.split("**");
  return parts.map((text, i) => ({ text, bold: i % 2 === 1 }));
}

function LineWithBold({
  line,
  style,
}: {
  line: string;
  style: StyleProp<TextStyle>;
}) {
  const segs = splitBoldSegments(line);
  return (
    <Text style={style}>
      {segs.map((s, i) =>
        s.bold ? (
          <Text key={i} style={{ fontWeight: "700" }}>
            {s.text}
          </Text>
        ) : (
          <React.Fragment key={i}>{s.text}</React.Fragment>
        )
      )}
    </Text>
  );
}

type Props = {
  text: string;
  /** When set, strips trailing "for {name}" and humanizes routine log phrasing. */
  petName?: string;
  style?: StyleProp<TextStyle>;
};

/**
 * Journal note body: optional [URGENT] / [CRITICAL] badge and minimal **bold** markdown.
 */
export function JournalNoteText({ text, petName, style }: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const baseStyle = useMemo(
    () => [{ fontSize: 15, color: theme.foreground, lineHeight: 22 }, style] as StyleProp<TextStyle>,
    [style, theme.foreground]
  );

  const displayText = stripUnspecifiedJournalFieldLines(
    humanizeRoutineJournalNote(text, petName) ?? text
  );
  if (!displayText.trim()) return null;

  const { badge, body } = parseClinicalPrefix(displayText);
  const lines = body.split("\n");

  const urgentBg = isDark ? "rgba(251,146,60,0.22)" : "rgba(254,215,170,0.95)";
  const criticalBg = isDark ? "rgba(239,68,68,0.25)" : "rgba(254,202,202,0.95)";
  const urgentFg = isDark ? "#fdba74" : "#9a3412";
  const criticalFg = isDark ? "#fecaca" : "#991b1b";

  return (
    <View style={{ gap: 8 }}>
      {badge ? (
        <View
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            backgroundColor: badge === "CRITICAL" ? criticalBg : urgentBg,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              letterSpacing: 0.6,
              color: badge === "CRITICAL" ? criticalFg : urgentFg,
            }}
          >
            {badge === "CRITICAL" ? "CRITICAL" : "URGENT"}
          </Text>
        </View>
      ) : null}
      <View style={{ gap: 4 }}>
        {lines.map((line, li) => (
          <LineWithBold key={li} line={line} style={baseStyle} />
        ))}
      </View>
    </View>
  );
}
