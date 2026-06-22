import type { SubscriptionPlan } from "@/constants/subscriptionPlans";
import { CTA } from "@/components/ui/CTA";
import { getSubscriptionModalTokens } from "@/components/subscription/subscriptionModalTokens";
import { useTheme } from "@/context/themeContext";
import { useSubscriptionOfferingPrices } from "@/hooks/useSubscriptionOfferingPrices";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PlanComparisonModalProps = {
  visible: boolean;
  onClose: () => void;
  currentPlan?: SubscriptionPlan;
  /** When true, hide subscribe CTAs (profile browse-only). */
  readOnly?: boolean;
  /** When true, disable subscribe CTAs while purchase sheet is opening. */
  subscribing?: boolean;
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
  subscribing = false,
  onSubscribe,
}: PlanComparisonModalProps) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const insets = useSafeAreaInsets();
  const ui = useMemo(() => getSubscriptionModalTokens(theme, isDark), [theme, isDark]);
  const { data: offeringPrices } = useSubscriptionOfferingPrices(visible);

  const planCardBorder = (isCurrent: boolean) =>
    Platform.OS === "android"
      ? {}
      : {
          borderWidth: isCurrent ? 2 : 1,
          borderColor: isCurrent ? theme.primary : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: ui.scrim, justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: ui.pageBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "88%",
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopWidth: Platform.OS === "android" ? 0 : 1,
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 18,
                color: ui.titleColor,
              }}
            >
              Compare plans
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} disabled={subscribing}>
              <Ionicons name="close" size={24} color={theme.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 8 }}
          >
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              const priceLabel =
                plan.id === "individual"
                  ? (offeringPrices?.individual.compareSummary ?? plan.price)
                  : plan.id === "family"
                    ? (offeringPrices?.family.compareSummary ?? plan.price)
                    : plan.price;
              const annualHint =
                plan.id === "individual" && offeringPrices?.individual.annual
                  ? `${offeringPrices.individual.annual} billed annually`
                  : plan.id === "family" && offeringPrices?.family.annual
                    ? `${offeringPrices.family.annual} billed annually`
                    : null;
              return (
                <View
                  key={plan.id}
                  style={{
                    borderRadius: 24,
                    padding: 18,
                    backgroundColor: ui.nestedBg,
                    ...planCardBorder(isCurrent),
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text
                      style={{
                        fontFamily: "Poppins_600SemiBold",
                        fontSize: 18,
                        color: theme.foreground,
                      }}
                    >
                      {plan.title}
                    </Text>
                    {isCurrent ? (
                      <Text
                        style={{
                          fontFamily: "Poppins_600SemiBold",
                          fontSize: 12,
                          color: theme.primary,
                        }}
                      >
                        Current plan
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    style={{
                      fontFamily: "Poppins_400Regular",
                      fontSize: 14,
                      color: theme.secondary,
                      marginBottom: annualHint ? 4 : 14,
                    }}
                  >
                    {priceLabel}
                  </Text>
                  {annualHint ? (
                    <Text
                      style={{
                        fontFamily: "Poppins_400Regular",
                        fontSize: 12,
                        color: theme.secondary,
                        marginBottom: 14,
                      }}
                    >
                      {annualHint}
                    </Text>
                  ) : null}
                  {plan.features.map((f) => (
                    <View key={f} style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
                      <Text
                        style={{
                          flex: 1,
                          fontFamily: "Poppins_400Regular",
                          fontSize: 13,
                          lineHeight: 19,
                          color: theme.foreground,
                        }}
                      >
                        {f}
                      </Text>
                    </View>
                  ))}
                  {!readOnly && plan.id !== "free" && onSubscribe ? (
                    <View style={{ marginTop: 8 }}>
                      <CTA
                        label={`Subscribe to ${plan.title}`}
                        onPress={() => onSubscribe(plan.id)}
                        size="MD"
                        style="Solid"
                        disabled={subscribing}
                        state={subscribing ? "Disable" : "Default"}
                      />
                    </View>
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
