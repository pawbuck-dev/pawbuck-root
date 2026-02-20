import { supabase } from "./supabase";

export type OnboardingEventType =
  | "email_onboarding_shown"
  | "email_onboarding_completed"
  | "health_records_tooltip_shown"
  | "health_records_tooltip_completed"
  | "pet_passport_onboarding_shown"
  | "pet_passport_onboarding_completed"
  | "messages_onboarding_shown"
  | "messages_onboarding_completed"
  | "onboarding_reset";

interface OnboardingEvent {
  event_type: OnboardingEventType;
  user_id?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * Track onboarding analytics events
 * Stores events in Supabase analytics_events table
 * Also logs to console for debugging
 */
export const trackOnboardingEvent = async (
  eventType: OnboardingEventType,
  metadata?: Record<string, any>
) => {
  const event: OnboardingEvent = {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    metadata,
  };

  // Get user ID if available
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      event.user_id = user.id;
    }
  } catch (error) {
    // User not authenticated, continue without user_id
  }

  // Log to console for debugging
  console.log("[Analytics] Onboarding Event:", event);

  // Store in Supabase for analytics
  try {
    const { data, error } = await supabase.from("analytics_events").insert({
      event_type: eventType,
      user_id: event.user_id || null,
      metadata: event.metadata || null,
      created_at: event.timestamp,
    }).select();

    if (error) {
      console.error("[Analytics] Error storing event in Supabase:", error);
      // Don't throw - allow app to continue even if analytics fails
    } else {
      console.log("[Analytics] Event stored successfully:", data);
    }
  } catch (error) {
    // Analytics table might not exist or other error
    console.error("[Analytics] Could not store event in database:", error);
    // Don't throw - allow app to continue even if analytics fails
  }
};

/**
 * Track onboarding completion rate
 * Calculates completion rate based on shown vs completed events
 */
export const getOnboardingCompletionRate = async (): Promise<{
  emailOnboarding: { shown: number; completed: number; rate: number };
  healthRecordsTooltip: { shown: number; completed: number; rate: number };
}> => {
  try {
    const { data: events } = await supabase
      .from("analytics_events")
      .select("event_type")
      .in("event_type", [
        "email_onboarding_shown",
        "email_onboarding_completed",
        "health_records_tooltip_shown",
        "health_records_tooltip_completed",
      ]);

    if (!events) {
      return {
        emailOnboarding: { shown: 0, completed: 0, rate: 0 },
        healthRecordsTooltip: { shown: 0, completed: 0, rate: 0 },
      };
    }

    const emailShown = events.filter(
      (e) => e.event_type === "email_onboarding_shown"
    ).length;
    const emailCompleted = events.filter(
      (e) => e.event_type === "email_onboarding_completed"
    ).length;
    const tooltipShown = events.filter(
      (e) => e.event_type === "health_records_tooltip_shown"
    ).length;
    const tooltipCompleted = events.filter(
      (e) => e.event_type === "health_records_tooltip_completed"
    ).length;

    return {
      emailOnboarding: {
        shown: emailShown,
        completed: emailCompleted,
        rate: emailShown > 0 ? emailCompleted / emailShown : 0,
      },
      healthRecordsTooltip: {
        shown: tooltipShown,
        completed: tooltipCompleted,
        rate: tooltipShown > 0 ? tooltipCompleted / tooltipShown : 0,
      },
    };
  } catch (error) {
    console.error("Error getting onboarding completion rate:", error);
    return {
      emailOnboarding: { shown: 0, completed: 0, rate: 0 },
      healthRecordsTooltip: { shown: 0, completed: 0, rate: 0 },
    };
  }
};
