import BottomNavBar from "@/components/home/BottomNavBar";
import { CTA } from "@/components/ui/CTA";
import { CONTACT_EMAIL } from "@/constants/contact";
import { supportComposeParams } from "@/utils/messagesCompose";
import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAGE_BG_LIGHT = "#F5F7F8";

const SUPPORT_SUBTITLE = "Get help from our support team";

const tileBorder = (isDark: boolean) =>
  Platform.OS === "android"
    ? {}
    : {
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      };

const tileShell = (isDark: boolean, extra?: object) => ({
  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
  borderRadius: 24,
  padding: 18,
  marginBottom: 14,
  overflow: "hidden" as const,
  ...tileBorder(isDark),
  ...extra,
});

const iconWell = (isDark: boolean) => ({
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EDEDEE",
  alignItems: "center" as const,
  justifyContent: "center" as const,
});

export default function ContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const pageBg = isDark ? theme.background : PAGE_BG_LIGHT;
  const titleColor = isDark ? theme.foreground : "#111111";
  const backFabBg = isDark ? theme.card : "#FFFFFF";
  const bodyMuted = isDark ? "rgba(255,255,255,0.6)" : "#5A5F6A";
  const nestedBg = isDark ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.045)";

  const handleCopyEmail = async () => {
    try {
      await Clipboard.setStringAsync(CONTACT_EMAIL);
      Alert.alert("Copied!", "Email address copied to clipboard");
    } catch {
      Alert.alert("Error", "Failed to copy email address");
    }
  };

  const handleSendEmail = () => {
    router.push({
      pathname: "/(home)/messages",
      params: supportComposeParams(CONTACT_EMAIL),
    });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: pageBg }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 16,
          paddingHorizontal: 20,
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[
            {
              position: "absolute",
              left: 20,
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: backFabBg,
              borderWidth: isDark ? 0 : 1,
              borderColor: isDark ? "transparent" : "#E8E8E8",
            },
            !isDark && {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={titleColor} />
        </Pressable>
        <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 18, color: titleColor }}>Contact Us</Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Email Support */}
        <View style={tileShell(isDark)}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "nowrap",
              alignItems: "flex-start",
              marginBottom: 18,
            }}
          >
            <View style={[iconWell(isDark), { marginRight: 12 }]}>
              <MaterialCommunityIcons
                name="email-check-outline"
                size={22}
                color={isDark ? "#FFFFFF" : "#1D2433"}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: theme.foreground, marginBottom: 4 }}>
                Email Support
              </Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: theme.secondary }}>{SUPPORT_SUBTITLE}</Text>
            </View>
          </View>

          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              letterSpacing: 0.5,
              color: theme.secondary,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Email address
          </Text>
          <Text
            selectable
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: theme.foreground,
              marginBottom: 18,
            }}
          >
            {CONTACT_EMAIL}
          </Text>

          <View style={{ flexDirection: "row", gap: 10, alignItems: "stretch" }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <CTA
                label="Copy"
                onPress={handleCopyEmail}
                size="MD"
                style="Outline"
                leftIcon={<Ionicons name="copy-outline" size={18} color={theme.foreground} />}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <CTA
                label="Send Email"
                onPress={handleSendEmail}
                size="MD"
                style="Solid"
                leftIcon={<Ionicons name="mail-outline" size={18} color="#FFFFFF" />}
              />
            </View>
          </View>
        </View>

        {/* Response time */}
        <View style={tileShell(isDark, { marginBottom: 20 })}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <View style={iconWell(isDark)}>
              <Ionicons name="time-outline" size={22} color={isDark ? "#FFFFFF" : "#1D2433"} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "700", color: theme.foreground, flex: 1 }}>Response Time</Text>
          </View>

          <View
            style={{
              borderRadius: 16,
              padding: 16,
              backgroundColor: nestedBg,
            }}
          >
            <Text style={{ fontSize: 13, color: bodyMuted, marginBottom: 4 }}>Typical response time</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground, marginBottom: 14 }}>
              Within 24 Hours
            </Text>
            <Text style={{ fontSize: 13, color: bodyMuted, marginBottom: 4 }}>Support availability</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Mon–Fri, 9am–6pm</Text>
          </View>
        </View>

        <Text
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: bodyMuted,
            textAlign: "center",
            paddingHorizontal: 16,
            marginBottom: 8,
          }}
        >
          {"🐕 Your pet's care is important to us."}
        </Text>
      </ScrollView>

      <BottomNavBar activeTab="profile" />
    </View>
  );
}
