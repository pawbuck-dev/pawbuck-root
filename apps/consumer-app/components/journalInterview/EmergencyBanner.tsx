import { MILO_ADR_DISCLAIMER, MILO_EMERGENCY_BANNER } from "@/constants/miloDisclaimers";
import React from "react";
import { Text, View } from "react-native";

type Props = {
  showAdrNote?: boolean;
};

export function EmergencyBanner({ showAdrNote }: Props) {
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 12,
        backgroundColor: "rgba(239,68,68,0.2)",
        marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "700", color: "#991b1b" }}>{MILO_EMERGENCY_BANNER}</Text>
      {showAdrNote ? (
        <Text style={{ fontSize: 12, color: "#7f1d1d", marginTop: 6 }}>{MILO_ADR_DISCLAIMER}</Text>
      ) : null}
    </View>
  );
}
