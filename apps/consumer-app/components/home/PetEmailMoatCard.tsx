import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Platform, Pressable, Share, Text, View } from "react-native";

const EMAIL_DOMAIN = "@pawbuck.app";

type Props = {
  petName: string;
  emailLocalPart: string;
  onCopy: () => void;
  copied: boolean;
};

export default function PetEmailMoatCard({ petName, emailLocalPart, onCopy, copied }: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const fullAddress = `${emailLocalPart}${EMAIL_DOMAIN}`;
  const [shareBusy, setShareBusy] = useState(false);

  const borderStyle =
    Platform.OS === "android"
      ? {}
      : {
          borderWidth: 1 as const,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        };

  const onShareWithVet = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    try {
      await Share.share({
        message: `Hi — please use this address for records and updates for ${petName}: ${fullAddress}\n\n(Sent from PawBuck)`,
      });
    } catch {
      /* user dismissed */
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
      <View
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
          borderRadius: 20,
          paddingVertical: 16,
          paddingHorizontal: 16,
          ...borderStyle,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <Ionicons name="mail-outline" size={22} color={theme.primary} style={{ marginRight: 10 }} />
          <Text style={{ fontSize: 17, fontWeight: "700", color: theme.foreground, flex: 1 }}>
            {`${petName}'s PawBuck email`}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: theme.secondary, lineHeight: 19, marginBottom: 12 }}>
          Forward lab results, receipts, or clinic threads to this address — they land in your pet's health
          record. Share it with your vet so nothing gets lost.
        </Text>
        <Pressable
          onPress={onCopy}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            marginBottom: 10,
          }}
        >
          <Ionicons name="mail" size={18} color={theme.foreground} style={{ marginRight: 10 }} />
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: "600",
              color: copied ? "#22C55E" : theme.foreground,
            }}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {fullAddress}
          </Text>
          <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={20} color={theme.secondary} />
        </Pressable>
        <Pressable
          onPress={() => void onShareWithVet()}
          disabled={shareBusy}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons name="share-outline" size={18} color={theme.primary} style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.primary }}>Share with vet</Text>
        </Pressable>
      </View>
    </View>
  );
}
