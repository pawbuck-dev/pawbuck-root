import { supabase } from "@/utils/supabase";

export interface MessageThread {
  id: string;
  pet_id: string;
  user_id: string;
  recipient_email: string;
  recipient_name: string | null;
  reply_to_address: string;
  subject: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  // Joined data
  pets?: {
    name: string;
  } | null;
  last_message?: ThreadMessage | null;
  message_count?: number;
  unread_count?: number;
  last_read_at?: string | null;
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  direction: "outbound" | "inbound";
  sender_email: string;
  recipient_email: string;
  cc: string[] | null;
  bcc: string[] | null;
  subject: string;
  body: string;
  sent_at: string;
}

/**
 * Fetch all message threads for the current user
 * Optionally filtered by pet ID
 * Optimized: Uses batched queries instead of N+1 pattern
 * Includes unread count based on thread_read_status
 */
export async function fetchMessageThreads(
  petId?: string
): Promise<MessageThread[]> {
  console.log(`[fetchMessageThreads] Fetching threads for petId: ${petId}`);

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("[fetchMessageThreads] No authenticated user");
    return [];
  }

  // Query 1: Fetch all threads (inbox only: not deleted)
  let query = supabase
    .from("message_threads")
    .select(
      `
      *,
      pets (
        name
      )
    `
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (petId) {
    query = query.eq("pet_id", petId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchMessageThreads] Error fetching threads:", error);
    throw error;
  }

  console.log(`[fetchMessageThreads] Found ${data?.length || 0} threads`);

  // Early return if no threads - avoid unnecessary queries
  if (!data || data.length === 0) {
    return [];
  }

  const threadIds = data.map((thread) => thread.id);

  // Query 2: Fetch ALL messages for all threads in one batch query
  // Ordered by sent_at desc so first message per thread is the latest
  const { data: allMessages } = await supabase
    .from("thread_messages")
    .select("*")
    .in("thread_id", threadIds)
    .order("sent_at", { ascending: false });

  // Query 3: Fetch read status for current user
  const { data: readStatusData } = await supabase
    .from("thread_read_status")
    .select("thread_id, last_read_at")
    .eq("user_id", user.id)
    .in("thread_id", threadIds);

  // Build read status lookup map
  const readStatusMap = new Map<string, string>();
  (readStatusData || []).forEach((status) => {
    readStatusMap.set(status.thread_id, status.last_read_at);
  });

  // Build lookup maps for last message, count, and unread count per thread
  const lastMessageMap = new Map<string, ThreadMessage>();
  const countMap = new Map<string, number>();
  const unreadCountMap = new Map<string, number>();

  // Process messages to extract last message, count, and unread count per thread
  (allMessages || []).forEach((message) => {
    const threadId = message.thread_id;

    // Increment total count for this thread
    countMap.set(threadId, (countMap.get(threadId) || 0) + 1);

    // Store only the first (latest) message per thread
    if (!lastMessageMap.has(threadId)) {
      lastMessageMap.set(threadId, message as ThreadMessage);
    }

    // Count unread messages (only inbound messages after last_read_at)
    if (message.direction === "inbound") {
      const lastReadAt = readStatusMap.get(threadId);
      if (!lastReadAt || new Date(message.sent_at) > new Date(lastReadAt)) {
        unreadCountMap.set(threadId, (unreadCountMap.get(threadId) || 0) + 1);
      }
    }
  });

  // Combine threads with their last message, count, and unread count
  const threadsWithMessages = data.map((thread) => ({
    ...thread,
    last_message: lastMessageMap.get(thread.id) || null,
    message_count: countMap.get(thread.id) || 0,
    unread_count: unreadCountMap.get(thread.id) || 0,
    last_read_at: readStatusMap.get(thread.id) || null,
  }));

  return threadsWithMessages as MessageThread[];
}

/**
 * Mark a thread as read for the current user
 * Uses upsert to create or update the read status
 */
export async function markThreadAsRead(threadId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("[markThreadAsRead] No authenticated user");
    return;
  }

  const { error } = await supabase.from("thread_read_status").upsert(
    {
      user_id: user.id,
      thread_id: threadId,
      last_read_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,thread_id",
    }
  );

  if (error) {
    console.error("[markThreadAsRead] Error marking thread as read:", error);
    throw error;
  }

  console.log(`[markThreadAsRead] Thread ${threadId} marked as read`);
}

/**
 * Fetch all messages for a specific thread
 */
export async function fetchThreadMessages(
  threadId: string
): Promise<ThreadMessage[]> {
  const { data, error } = await supabase
    .from("thread_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: true });

  if (error) throw error;

  return (data || []) as ThreadMessage[];
}

/**
 * Fetch a single thread by ID
 */
export async function fetchThread(
  threadId: string
): Promise<MessageThread | null> {
  const { data, error } = await supabase
    .from("message_threads")
    .select(
      `
      *,
      pets (
        name
      )
    `
    )
    .eq("id", threadId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw error;
  }

  // Fetch last message and count
  const { data: messages } = await supabase
    .from("thread_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: false })
    .limit(1);

  const { count } = await supabase
    .from("thread_messages")
    .select("*", { count: "exact", head: true })
    .eq("thread_id", threadId);

  return {
    ...data,
    last_message: messages?.[0] || null,
    message_count: count || 0,
  } as MessageThread;
}

/** Trash: threads that were soft-deleted. Health records already extracted are not affected. */
export async function fetchTrashThreads(
  petId?: string
): Promise<MessageThread[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("message_threads")
    .select(
      `
      *,
      pets (
        name
      )
    `
    )
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (petId) query = query.eq("pet_id", petId);
  const { data, error } = await query;
  if (error) {
    console.error("[fetchTrashThreads] Error:", error);
    throw error;
  }
  if (!data || data.length === 0) return [];

  const threadIds = data.map((t) => t.id);
  const { data: allMessages } = await supabase
    .from("thread_messages")
    .select("*")
    .in("thread_id", threadIds)
    .order("sent_at", { ascending: false });

  const readStatusData = await supabase
    .from("thread_read_status")
    .select("thread_id, last_read_at")
    .eq("user_id", user.id)
    .in("thread_id", threadIds);
  const readStatusMap = new Map<string, string>();
  (readStatusData.data || []).forEach((s) =>
    readStatusMap.set(s.thread_id, s.last_read_at)
  );

  const lastMessageMap = new Map<string, ThreadMessage>();
  const countMap = new Map<string, number>();
  const unreadCountMap = new Map<string, number>();
  (allMessages || []).forEach((message) => {
    const tid = message.thread_id;
    countMap.set(tid, (countMap.get(tid) || 0) + 1);
    if (!lastMessageMap.has(tid))
      lastMessageMap.set(tid, message as ThreadMessage);
    if (message.direction === "inbound") {
      const lastRead = readStatusMap.get(tid);
      if (
        !lastRead ||
        new Date(message.sent_at) > new Date(lastRead)
      ) {
        unreadCountMap.set(tid, (unreadCountMap.get(tid) || 0) + 1);
      }
    }
  });

  return data.map((thread) => ({
    ...thread,
    last_message: lastMessageMap.get(thread.id) || null,
    message_count: countMap.get(thread.id) || 0,
    unread_count: unreadCountMap.get(thread.id) || 0,
    last_read_at: readStatusMap.get(thread.id) || null,
  })) as MessageThread[];
}

/**
 * Move a thread to Trash (soft delete). Does not delete health records already extracted.
 * Records audit for compliance.
 */
export async function softDeleteThread(threadId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error: updateError } = await supabase
    .from("message_threads")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", threadId)
    .eq("user_id", user.id);

  if (updateError) throw updateError;

  await supabase.from("email_delete_audit").insert({
    thread_id: threadId,
    user_id: user.id,
    action: "deleted",
  });
}

/**
 * Restore a thread from Trash. Records audit for compliance.
 */
export async function restoreThread(threadId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error: updateError } = await supabase
    .from("message_threads")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", threadId)
    .eq("user_id", user.id);

  if (updateError) throw updateError;

  await supabase.from("email_delete_audit").insert({
    thread_id: threadId,
    user_id: user.id,
    action: "restored",
  });
}
