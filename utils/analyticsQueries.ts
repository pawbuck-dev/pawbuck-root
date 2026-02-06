import { supabase } from "./supabase";
import { OnboardingEventType } from "./analytics";

/**
 * Get onboarding analytics summary
 * Returns counts and completion rates for onboarding events
 */
export const getOnboardingAnalytics = async (): Promise<{
  emailOnboarding: {
    shown: number;
    completed: number;
    completionRate: number;
    lastShown?: string;
    lastCompleted?: string;
  };
  healthRecordsTooltip: {
    shown: number;
    completed: number;
    completionRate: number;
    lastShown?: string;
    lastCompleted?: string;
  };
  totalUsers: number;
  totalEvents: number;
}> => {
  try {
    // Get all onboarding events
    const { data: events, error } = await supabase
      .from("analytics_events")
      .select("event_type, user_id, created_at")
      .in("event_type", [
        "email_onboarding_shown",
        "email_onboarding_completed",
        "health_records_tooltip_shown",
        "health_records_tooltip_completed",
      ])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching analytics:", error);
      throw error;
    }

    if (!events || events.length === 0) {
      return {
        emailOnboarding: {
          shown: 0,
          completed: 0,
          completionRate: 0,
        },
        healthRecordsTooltip: {
          shown: 0,
          completed: 0,
          completionRate: 0,
        },
        totalUsers: 0,
        totalEvents: 0,
      };
    }

    // Calculate email onboarding stats
    const emailShown = events.filter(
      (e) => e.event_type === "email_onboarding_shown"
    );
    const emailCompleted = events.filter(
      (e) => e.event_type === "email_onboarding_completed"
    );

    // Calculate health records tooltip stats
    const tooltipShown = events.filter(
      (e) => e.event_type === "health_records_tooltip_shown"
    );
    const tooltipCompleted = events.filter(
      (e) => e.event_type === "health_records_tooltip_completed"
    );

    // Get unique users
    const uniqueUserIds = new Set(
      events.map((e) => e.user_id).filter((id): id is string => !!id)
    );

    return {
      emailOnboarding: {
        shown: emailShown.length,
        completed: emailCompleted.length,
        completionRate:
          emailShown.length > 0
            ? emailCompleted.length / emailShown.length
            : 0,
        lastShown: emailShown[0]?.created_at,
        lastCompleted: emailCompleted[0]?.created_at,
      },
      healthRecordsTooltip: {
        shown: tooltipShown.length,
        completed: tooltipCompleted.length,
        completionRate:
          tooltipShown.length > 0
            ? tooltipCompleted.length / tooltipShown.length
            : 0,
        lastShown: tooltipShown[0]?.created_at,
        lastCompleted: tooltipCompleted[0]?.created_at,
      },
      totalUsers: uniqueUserIds.size,
      totalEvents: events.length,
    };
  } catch (error) {
    console.error("Error getting onboarding analytics:", error);
    return {
      emailOnboarding: {
        shown: 0,
        completed: 0,
        completionRate: 0,
      },
      healthRecordsTooltip: {
        shown: 0,
        completed: 0,
        completionRate: 0,
      },
      totalUsers: 0,
      totalEvents: 0,
    };
  }
};

/**
 * Get events by type within a date range
 */
export const getEventsByType = async (
  eventType: OnboardingEventType,
  startDate?: string,
  endDate?: string
) => {
  try {
    let query = supabase
      .from("analytics_events")
      .select("*")
      .eq("event_type", eventType)
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching events by type:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error getting events by type:", error);
    return [];
  }
};

/**
 * Get daily onboarding completion rates
 */
export const getDailyCompletionRates = async (days: number = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    const { data: events, error } = await supabase
      .from("analytics_events")
      .select("event_type, created_at")
      .in("event_type", [
        "email_onboarding_shown",
        "email_onboarding_completed",
        "health_records_tooltip_shown",
        "health_records_tooltip_completed",
      ])
      .gte("created_at", startDateStr)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching daily rates:", error);
      throw error;
    }

    if (!events) return [];

    // Group by date
    const dailyData: Record<
      string,
      {
        date: string;
        emailShown: number;
        emailCompleted: number;
        tooltipShown: number;
        tooltipCompleted: number;
      }
    > = {};

    events.forEach((event) => {
      const date = new Date(event.created_at).toISOString().split("T")[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          emailShown: 0,
          emailCompleted: 0,
          tooltipShown: 0,
          tooltipCompleted: 0,
        };
      }

      switch (event.event_type) {
        case "email_onboarding_shown":
          dailyData[date].emailShown++;
          break;
        case "email_onboarding_completed":
          dailyData[date].emailCompleted++;
          break;
        case "health_records_tooltip_shown":
          dailyData[date].tooltipShown++;
          break;
        case "health_records_tooltip_completed":
          dailyData[date].tooltipCompleted++;
          break;
      }
    });

    return Object.values(dailyData).map((day) => ({
      ...day,
      emailCompletionRate:
        day.emailShown > 0 ? day.emailCompleted / day.emailShown : 0,
      tooltipCompletionRate:
        day.tooltipShown > 0 ? day.tooltipCompleted / day.tooltipShown : 0,
    }));
  } catch (error) {
    console.error("Error getting daily completion rates:", error);
    return [];
  }
};
