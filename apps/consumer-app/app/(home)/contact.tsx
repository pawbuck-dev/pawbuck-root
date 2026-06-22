import { SettingsSubscreenLayout } from "@/components/layout/SettingsSubscreenLayout";
import { getSettingsSubscreenTokens } from "@/components/layout/settingsSubscreenTokens";
import { CTA } from "@/components/ui/CTA";
import { CONTACT_EMAIL } from "@/constants/contact";
import { supportComposeParams } from "@/utils/messagesCompose";
import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";

const SUPPORT_SUBTITLE = "Get help from our support team";

export default function ContactScreen() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const t = getSettingsSubscreenTokens(theme, isDark);

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

  const iconWell = {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.iconWellBg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  return (
    <SettingsSubscreenLayout title="Contact Us">
      <View
        style={{
          backgroundColor: t.tileBg,
          borderRadius: t.tileRadius,
          padding: 18,
          marginBottom: 14,
          overflow: "hidden",
          ...t.tileBorder,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 18 }}>
          <View style={[iconWell, { marginRight: 12 }]}>
            <MaterialCommunityIcons name="email-check-outline" size={22} color={t.iconFg} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontFamily: "Poppins_700Bold",
                fontSize: 17,
                color: theme.foreground,
                marginBottom: 4,
              }}
            >
              Email Support
            </Text>
            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                fontSize: 14,
                lineHeight: 20,
                color: theme.secondary,
              }}
            >
              {SUPPORT_SUBTITLE}
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            fontSize: 12,
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
            fontFamily: "Poppins_700Bold",
            fontSize: 20,
            color: theme.foreground,
            marginBottom: 18,
          }}
        >
          {CONTACT_EMAIL}
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <CTA
              label="Copy"
              onPress={handleCopyEmail}
              size="MD"
              style="Outline"
              leftIcon={<Ionicons name="copy-outline" size={18} color={theme.foreground} />}
            />
          </View>
          <View style={{ flex: 1 }}>
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

      <View
        style={{
          backgroundColor: t.tileBg,
          borderRadius: t.tileRadius,
          padding: 18,
          marginBottom: 20,
          overflow: "hidden",
          ...t.tileBorder,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <View style={iconWell}>
            <Ionicons name="time-outline" size={22} color={t.iconFg} />
          </View>
          <Text
            style={{
              fontFamily: "Poppins_700Bold",
              fontSize: 17,
              color: theme.foreground,
              flex: 1,
            }}
          >
            Response Time
          </Text>
        </View>
        <View style={{ borderRadius: 16, padding: 16, backgroundColor: t.nestedBg }}>
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 13, color: t.bodyMuted, marginBottom: 4 }}>
            Typical response time
          </Text>
          <Text
            style={{
              fontFamily: "Poppins_700Bold",
              fontSize: 16,
              color: theme.foreground,
              marginBottom: 14,
            }}
          >
            Within 24 Hours
          </Text>
          <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 13, color: t.bodyMuted, marginBottom: 4 }}>
            Support availability
          </Text>
          <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 16, color: theme.foreground }}>
            Mon–Fri, 9am–6pm
          </Text>
        </View>
      </View>

      <Text
        style={{
          fontFamily: "Poppins_400Regular",
          fontSize: 14,
          lineHeight: 20,
          color: t.bodyMuted,
          textAlign: "center",
          paddingHorizontal: 16,
        }}
      >
        {"🐕 Your pet's care is important to us."}
      </Text>
    </SettingsSubscreenLayout>
  );
}
