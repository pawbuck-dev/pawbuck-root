import { createSupabaseClient } from "./supabase-utils.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
}

export interface SendNotificationResult {
  success: boolean;
  ticketIds?: string[];
  errors?: string[];
}

/**
 * Get all push tokens for a user
 * @param userId - The user's ID
 * @returns Array of push tokens
 */
export async function getUserPushTokens(userId: string): Promise<string[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("push_tokens")
    .select("push_token")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching push tokens:", error);
    throw new Error(`Failed to fetch push tokens: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((row) => row.push_token).filter(Boolean);
}

/**
 * Send a push notification to a user
 * @param userId - The user's ID
 * @param notification - The notification payload
 * @returns Result with success status and ticket IDs
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
 * @param pushTokens - Array of Expo push tokens
 * @param notification - The notification payload
 * @returns Result with success status and ticket IDs
 */
export async function sendPushNotifications(
  pushTokens: string[],
  notification: NotificationPayload
): Promise<SendNotificationResult> {
  const messages = pushTokens.map((token) => ({
    to: token,
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    sound: notification.sound ?? "default",
    badge: notification.badge,
    channelId: notification.channelId,
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

    // Process tickets
    const ticketIds: string[] = [];
    const errors: string[] = [];

    if (result.data) {
      for (const ticket of result.data) {
        if (ticket.status === "ok") {
          ticketIds.push(ticket.id);
        } else if (ticket.status === "error") {
          errors.push(ticket.message || "Unknown error");
          // Handle specific error types
          if (ticket.details?.error === "DeviceNotRegistered") {
            console.log("Device not registered, token should be removed");
            // Optionally: Remove invalid token from database
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
 * @param userIds - Array of user IDs
 * @param notification - The notification payload
 * @returns Map of userId to result
 */
export async function sendNotificationToUsers(
  userIds: string[],
  notification: NotificationPayload
): Promise<Map<string, SendNotificationResult>> {
  const results = new Map<string, SendNotificationResult>();

  // Fetch all tokens for all users in parallel
  const tokenPromises = userIds.map(async (userId) => {
    const tokens = await getUserPushTokens(userId);
    return { userId, tokens };
  });

  const userTokens = await Promise.all(tokenPromises);

  // Collect all tokens and map them to users
  const allTokens: string[] = [];
  const tokenToUserMap = new Map<string, string>();

  for (const { userId, tokens } of userTokens) {
    if (tokens.length === 0) {
      results.set(userId, {
        success: false,
        errors: ["No push tokens found for user"],
      });
    } else {
      for (const token of tokens) {
        allTokens.push(token);
        tokenToUserMap.set(token, userId);
      }
    }
  }

  // Send all notifications in a single batch
  if (allTokens.length > 0) {
    const batchResult = await sendPushNotifications(allTokens, notification);

    // For now, mark all users with tokens as having the batch result
    for (const { userId, tokens } of userTokens) {
      if (tokens.length > 0) {
        results.set(userId, batchResult);
      }
    }
  }

  return results;
}
