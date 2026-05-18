import { categoryDisplayLabel } from "@/services/calendarEvents";
import type { CalendarEventCategory } from "@/types/calendarEvent";
import type { CalendarEvent } from "@/types/calendarEvent";
import { buildMonthGrid, datesWithEventCategories } from "@/utils/petCalendarGrid";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

export const CATEGORY_DOT_COLORS: Record<CalendarEventCategory, string> = {
  vet: "#3BD0D2",
  grooming: "#A78BFA",
  walk: "#34D399",
  other: "#94A3B8",
};

const CATEGORY_ORDER: CalendarEventCategory[] = ["vet", "grooming", "walk", "other"];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  year: number;
  month: number;
  selectedDay: string;
  events: CalendarEvent[];
  onSelectDay: (isoDate: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

export default function PetCalendarMonthGrid({
  year,
  month,
  selectedDay,
  events,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const todayIso = moment().format("YYYY-MM-DD");
  const cells = useMemo(() => buildMonthGrid(year, month, todayIso), [year, month, todayIso]);
  const categoriesByDate = useMemo(() => datesWithEventCategories(events), [events]);

  const monthLabel = moment({ year, month, day: 1 }).format("MMMM YYYY");

  return (
    <View
      style={{
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Pressable onPress={onPrevMonth} hitSlop={12} accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={22} color={theme.foreground} />
        </Pressable>
        <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 16, color: theme.foreground }}>
          {monthLabel}
        </Text>
        <Pressable onPress={onNextMonth} hitSlop={12} accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={22} color={theme.foreground} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", marginBottom: 6 }}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontFamily: "Poppins_500Medium",
                fontSize: 11,
                color: theme.secondary,
              }}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((cell) => {
          const isSelected = cell.isoDate === selectedDay;
          const dayCategories = categoriesByDate.get(cell.isoDate);
          const dots = CATEGORY_ORDER.filter((c) => dayCategories?.has(c)).slice(0, 3);

          return (
            <Pressable
              key={cell.isoDate}
              onPress={() => onSelectDay(cell.isoDate)}
              style={{
                width: `${100 / 7}%`,
                aspectRatio: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 4,
              }}
              accessibilityRole="button"
              accessibilityLabel={cell.isoDate}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected
                    ? theme.primary
                    : cell.isToday
                      ? isDark
                        ? "rgba(59,208,210,0.15)"
                        : "rgba(59,208,210,0.12)"
                      : "transparent",
                  borderWidth: cell.isToday && !isSelected ? 1.5 : 0,
                  borderColor: theme.primary,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 14,
                    color: isSelected
                      ? theme.primaryForeground
                      : cell.inMonth
                        ? theme.foreground
                        : theme.secondary,
                    opacity: cell.inMonth ? 1 : 0.35,
                  }}
                >
                  {moment(cell.isoDate).date()}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 3, marginTop: 2, minHeight: 6 }}>
                {dots.map((cat) => (
                  <View
                    key={cat}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: CATEGORY_DOT_COLORS[cat],
                    }}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        }}
      >
        {(["vet", "grooming", "walk"] as const).map((cat) => (
          <View key={cat} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: CATEGORY_DOT_COLORS[cat],
              }}
            />
            <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: theme.secondary }}>
              {categoryDisplayLabel(cat)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
