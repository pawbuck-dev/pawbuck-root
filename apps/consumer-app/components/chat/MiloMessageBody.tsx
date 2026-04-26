import { useTheme } from "@/context/themeContext";
import React from "react";
import { Text, View } from "react-native";

/** Model callouts — keep in sync with MiloReasoningService answer system prompt. */
const NEEDS_REVIEW_PREFIX = "> **Needs review:**";
const CRITICAL_SYMPTOM_PREFIX = "> **Critical symptom:**";
const COMPLETED_RECORD_PREFIX = "> **Completed record:**";
const FROM_RECORDS_PREFIX = "> **From your records:**";
/** Legacy — still rendered as Needs review styling */
const NEEDS_ATTENTION_PREFIX = "> **Needs attention:**";

function renderBoldSegments(
  line: string,
  baseStyle: { fontSize: number; lineHeight: number; color: string },
  boldColor: string
): React.ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={baseStyle}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          const inner = part.slice(2, -2);
          return (
            <Text key={i} style={[baseStyle, { fontWeight: "700", color: boldColor }]}>
              {inner}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

type CalloutVariant = "needsReview" | "completed";

function CalloutBlock(props: {
  variant: CalloutVariant;
  pillLabel: string;
  rest: string;
  base: { fontSize: number; lineHeight: number; color: string };
  boldColor: string;
  theme: { warning: string; primary: string; foreground: string };
  isDark: boolean;
}) {
  const { variant, pillLabel, rest, base, boldColor, theme, isDark } = props;
  const isAmber = variant === "needsReview";
  const accent = isAmber ? theme.warning : theme.primary;
  const bg = isAmber
    ? isDark
      ? "rgba(245, 158, 11, 0.14)"
      : "rgba(245, 158, 11, 0.1)"
    : isDark
      ? "rgba(43, 168, 158, 0.16)"
      : "rgba(43, 168, 158, 0.1)";
  const pillBg = isAmber ? theme.warning : theme.primary;
  const pillText = isAmber ? "#0F1419" : "#FFFFFF";

  return (
    <View
      style={{
        borderLeftWidth: 3,
        borderLeftColor: accent,
        paddingLeft: 12,
        paddingVertical: 10,
        marginVertical: 6,
        backgroundColor: bg,
        borderRadius: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: rest ? 6 : 0 }}>
        <View
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: pillBg,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "700", color: pillText }}>{pillLabel}</Text>
        </View>
      </View>
      {rest ? renderBoldSegments(rest, base, boldColor) : null}
    </View>
  );
}

interface MiloMessageBodyProps {
  content: string;
  /** User messages are plain text; assistant gets headers / callouts / bold. */
  variant: "user" | "assistant";
}

/**
 * Milo assistant rendering: ### Summary header, Review Inbox–style callout pills, **bold** spans.
 */
export const MiloMessageBody: React.FC<MiloMessageBodyProps> = ({ content, variant }) => {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const base = {
    fontSize: 15,
    lineHeight: 22,
    color: variant === "user" ? "#FFFFFF" : theme.foreground,
  };
  const boldColor = variant === "user" ? "#FFFFFF" : theme.foreground;

  if (variant === "user") {
    return <Text style={base}>{content}</Text>;
  }

  const lines = content.split("\n");

  return (
    <View>
      {lines.map((line, index) => {
        const key = `${index}-${line.slice(0, 24)}`;
        if (line.trim() === "") {
          return <View key={key} style={{ height: 6 }} />;
        }
        if (line.startsWith("### ")) {
          const title = line.slice(4).trim();
          const isSummary = /^summary\b/i.test(title);
          return (
            <Text
              key={key}
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: isSummary ? theme.primary : theme.foreground,
                marginTop: index === 0 ? 0 : 10,
                marginBottom: 4,
                borderBottomWidth: isSummary ? 2 : 0,
                borderBottomColor: isSummary ? theme.primary : "transparent",
                paddingBottom: isSummary ? 4 : 0,
              }}
            >
              {title}
            </Text>
          );
        }
        if (line.startsWith(NEEDS_REVIEW_PREFIX) || line.startsWith(NEEDS_ATTENTION_PREFIX)) {
          const rest = line
            .slice(line.startsWith(NEEDS_REVIEW_PREFIX) ? NEEDS_REVIEW_PREFIX.length : NEEDS_ATTENTION_PREFIX.length)
            .trim();
          return (
            <CalloutBlock
              key={key}
              variant="needsReview"
              pillLabel="Needs review"
              rest={rest}
              base={base}
              boldColor={boldColor}
              theme={theme}
              isDark={isDark}
            />
          );
        }
        if (line.startsWith(CRITICAL_SYMPTOM_PREFIX)) {
          const rest = line.slice(CRITICAL_SYMPTOM_PREFIX.length).trim();
          return (
            <CalloutBlock
              key={key}
              variant="needsReview"
              pillLabel="Critical symptom"
              rest={rest}
              base={base}
              boldColor={boldColor}
              theme={theme}
              isDark={isDark}
            />
          );
        }
        if (line.startsWith(COMPLETED_RECORD_PREFIX) || line.startsWith(FROM_RECORDS_PREFIX)) {
          const rest = line
            .slice(
              line.startsWith(COMPLETED_RECORD_PREFIX)
                ? COMPLETED_RECORD_PREFIX.length
                : FROM_RECORDS_PREFIX.length
            )
            .trim();
          return (
            <CalloutBlock
              key={key}
              variant="completed"
              pillLabel="Completed"
              rest={rest}
              base={base}
              boldColor={boldColor}
              theme={theme}
              isDark={isDark}
            />
          );
        }
        return <View key={key}>{renderBoldSegments(line, base, boldColor)}</View>;
      })}
    </View>
  );
};
