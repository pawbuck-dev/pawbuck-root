import type { Json } from "@/database.types";
import { supabase } from "@/utils/supabase";

export type SubscriptionAnalyticsEventType =
  | "paywall_impression"
  | "paywall_subscribe_tap"
  | "paywall_purchase_success"
  | "paywall_dismiss"
  | "premium_feature_blocked";

/**
 * Subscription funnel events (stored in analytics_events like onboarding events).
 */
export async function trackSubscriptionEvent(
  eventType: SubscriptionAnalyticsEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const metaJson: Json | null = metadata
      ? (JSON.parse(JSON.stringify(metadata)) as Json)
      : null;

    const { error } = await supabase.from("analytics_events").insert({
      event_type: eventType,
      user_id: user?.id ?? null,
      metadata: metaJson,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.warn("[subscriptionAnalytics]", error.message);
    }
  } catch (e) {
    console.warn("[subscriptionAnalytics]", e);
  }
}
