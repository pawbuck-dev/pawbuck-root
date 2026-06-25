import { createSupabaseClient } from "./supabase-utils.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Max devices to notify per user (most recently seen first). */
const MAX_PUSH_DEVICES_PER_USER = 4;

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  /** iOS notification grouping (same thread stacks on lock screen). */
  threadId?: string;
  /** Android collapse key — replaces prior notification with same id. */
  collapseId?: string;
}

export interface SendNotificationResult {
  success: boolean;
  ticketIds?: string[];
  errors?: string[];
}

/**
 * Get active push tokens for a user (deduped, most recently seen devices first).
 */
export async function getUserPushTokens(userId: string): Promise<string[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("push_tokens")
    .select("token, last_seen")
    .eq("user_id", userId)
    .order("last_seen", { ascending: false });

  if (error) {
    console.error("Error fetching push tokens:", error);
    throw new Error(`Failed to fetch push tokens: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const row of data) {
    if (!row.token || seen.has(row.token)) continue;
    seen.add(row.token);
    unique.push(row.token);
    if (unique.length >= MAX_PUSH_DEVICES_PER_USER) break;
  }

  return unique;
}

/**
 * Send a push notification to a user
 */
export async function sendNotificationToUser(
  userId: string,
  notification: NotificationPayload
): Promise<SendNotificationResult> {
  const tokens = await getUserPushTokens(userId);

  if (tokens.length === 0) {
    console.log(`No push tokens found for user ${userId}`);
    return {
      success: false,
      errors: ["No push tokens found for user"],
    };
  }

  return await sendPushNotifications(tokens, notification);
}

/**
 * Send push notifications to multiple tokens
 */
export async function sendPushNotifications(
  pushTokens: string[],
  notification: NotificationPayload
): Promise<SendNotificationResult> {
  const uniqueTokens = [...new Set(pushTokens.filter(Boolean))];
  if (uniqueTokens.length === 0) {
    return { success: false, errors: ["No push tokens provided"] };
  }

  const threadId =
    notification.threadId ??
    (typeof notification.data?.threadId === "string" ? notification.data.threadId : undefined);

  const messages = uniqueTokens.map((token) => ({
    to: token,
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    sound: notification.sound ?? "default",
    badge: notification.badge,
    channelId: notification.channelId,
    threadId,
    collapseId: notification.collapseId,
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Expo Push API error:", errorText);
      return {
        success: false,
        errors: [`Expo Push API error: ${response.status} ${errorText}`],
      };
    }

    const result = await response.json();

    const ticketIds: string[] = [];
    const errors: string[] = [];

    if (result.data) {
      for (const ticket of result.data) {
        if (ticket.status === "ok") {
          ticketIds.push(ticket.id);
        } else if (ticket.status === "error") {
          errors.push(ticket.message || "Unknown error");
          if (ticket.details?.error === "DeviceNotRegistered") {
            console.log("Device not registered, token should be removed");
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      ticketIds: ticketIds.length > 0 ? ticketIds : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Send notification to multiple users
 */
export async function sendNotificationToUsers(
  userIds: string[],
  notification: NotificationPayload
): Promise<Map<string, SendNotificationResult>> {
  const results = new Map<string, SendNotificationResult>();

  const tokenPromises = userIds.map(async (userId) => {
    const tokens = await getUserPushTokens(userId);
    return { userId, tokens };
  });

  const userTokens = await Promise.all(tokenPromises);

  const allTokens: string[] = [];
  for (const { userId, tokens } of userTokens) {
    if (tokens.length === 0) {
      results.set(userId, {
        success: false,
        errors: ["No push tokens found for user"],
      });
    } else {
      allTokens.push(...tokens);
    }
  }

  if (allTokens.length > 0) {
    const batchResult = await sendPushNotifications(allTokens, notification);

    for (const { userId, tokens } of userTokens) {
      if (tokens.length > 0) {
        results.set(userId, batchResult);
      }
    }
  }

  return results;
}
