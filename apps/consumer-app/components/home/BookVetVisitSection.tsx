import { CTA } from "@/components/ui/CTA";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Platform, Text, View } from "react-native";

type BookVetVisitSectionProps = {
  petName: string;
  onSchedule?: () => void;
};

export default function BookVetVisitSection({ petName, onSchedule }: BookVetVisitSectionProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const isAndroid = Platform.OS === "android";

  const cardBorderStyle = isAndroid
    ? {}
    : { borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
          borderRadius: 20,
          overflow: "hidden",
          ...cardBorderStyle,
        }}
      >
        {/* Subtle teal gradient accent on right side */}
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "50%",
            height: "100%",
            opacity: isDark ? 0.08 : 0.15,
          }}
        >
          <View
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: isDark ? "#3BD0D2" : "#B2EBF2",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 40,
              right: 20,
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: isDark ? "#3BD0D2" : "#B2EBF2",
            }}
          />
        </View>

        <View style={{ flexDirection: "row", minHeight: 180 }}>
          {/* Left content */}
          <View style={{ flex: 1, padding: 20, justifyContent: "space-between", zIndex: 2 }}>
            {/* Header row */}
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EDEDEE",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="calendar" size={22} color={isDark ? "#FFFFFF" : "#1D2433"} />
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: isDark ? "#FFFFFF" : "#0D0F0F",
                  }}
                >
                  Book A Vet Visit
                </Text>
              </View>

              {/* Description */}
              <Text
                style={{
                  fontSize: 14,
                  color: isDark ? "rgba(255,255,255,0.7)" : "#5A5F6A",
                  lineHeight: 20,
                  marginBottom: 20,
                }}
              >
                {petName}'s next checkup is{"\n"}just a tap away ✨
              </Text>
            </View>

            {/* Schedule button — Figma CTA SM */}
            <CTA
              label="Schedule Now"
              onPress={onSchedule}
              size="SM"
              containerStyle={{ alignSelf: "flex-start" }}
            />
          </View>

          {/* Right illustration */}
          <View
            style={{
              width: 150,
              justifyContent: "flex-end",
              alignItems: "flex-end",
              zIndex: 1,
            }}
          >
            <Image
              source={require("@/assets/images/vet.png")}
              style={{
                width: 160,
                height: 160,
                marginBottom: -4,
                marginRight: -8,
              }}
              contentFit="contain"
            />
          </View>
        </View>
      </View>
    </View>
  );
}
