import type { SubscriptionPlan } from "@/constants/subscriptionPlans";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";

type PlanComparisonModalProps = {
  visible: boolean;
  onClose: () => void;
  currentPlan?: SubscriptionPlan;
  /** When true, hide subscribe CTAs (profile browse-only). */
  readOnly?: boolean;
  onSubscribe?: (plan: SubscriptionPlan) => void;
};

const PLANS: {
  id: SubscriptionPlan;
  title: string;
  price: string;
  features: string[];
}[] = [
  {
    id: "free",
    title: "Free",
    price: "$0",
    features: [
      "3 Milo AI conversations / month",
      "2 AI journal entries / month",
      "10 document uploads",
      "1 pet profile",
      "Health records & messaging",
    ],
  },
  {
    id: "individual",
    title: "Individual",
    price: "from $5.99/mo",
    features: [
      "Unlimited Milo & AI journal",
      "Unlimited document uploads",
      "Pet Passport PDF export",
      "Full vet prep briefs",
      "1 pet profile",
    ],
  },
  {
    id: "family",
    title: "Family",
    price: "from $9.99/mo",
    features: [
      "Everything in Individual",
      "Unlimited pet profiles",
      "Up to 5 household members",
      "Multi-pet dashboard",
    ],
  },
];

export default function PlanComparisonModal({
  visible,
  onClose,
  currentPlan = "free",
  readOnly = false,
  onSubscribe,
}: PlanComparisonModalProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: theme.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "85%",
            paddingBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "700", color: theme.foreground }}>
              Compare plans
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              return (
                <View
                  key={plan.id}
                  style={{
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: isCurrent ? 2 : 1,
                    borderColor: isCurrent ? theme.primary : theme.border,
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FAFAFA",
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: theme.foreground }}>
                      {plan.title}
                    </Text>
                    {isCurrent ? (
                      <Text style={{ fontSize: 12, fontWeight: "700", color: theme.primary }}>
                        Current plan
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 14, color: theme.secondary, marginBottom: 12 }}>
                    {plan.price}
                  </Text>
                  {plan.features.map((f) => (
                    <View key={f} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                      <Ionicons name="checkmark-circle" size={16} color="#2BA89E" />
                      <Text style={{ flex: 1, fontSize: 13, color: theme.foreground }}>{f}</Text>
                    </View>
                  ))}
                  {!readOnly && plan.id !== "free" && onSubscribe ? (
                    <TouchableOpacity
                      onPress={() => onSubscribe(plan.id)}
                      style={{
                        marginTop: 12,
                        backgroundColor: "#2BA89E",
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#FFF", fontWeight: "700" }}>
                        Subscribe to {plan.title}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
