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
  // Joined data
  pets?: {
    name: string;
  } | null;
  last_message?: ThreadMessage | null;
  message_count?: number;
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
 */
export async function fetchMessageThreads(
  petId?: string
): Promise<MessageThread[]> {
  console.log(`[fetchMessageThreads] Fetching threads for petId: ${petId}`);
  
  // Query 1: Fetch all threads
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

  // Build lookup maps for last message and count per thread
  const lastMessageMap = new Map<string, ThreadMessage>();
  const countMap = new Map<string, number>();

  // Process messages to extract last message and count per thread
  (allMessages || []).forEach((message) => {
    const threadId = message.thread_id;
    
    // Increment count for this thread
    countMap.set(threadId, (countMap.get(threadId) || 0) + 1);
    
    // Store only the first (latest) message per thread
    if (!lastMessageMap.has(threadId)) {
      lastMessageMap.set(threadId, message as ThreadMessage);
    }
  });

  // Combine threads with their last message and count
  const threadsWithMessages = data.map((thread) => ({
    ...thread,
    last_message: lastMessageMap.get(thread.id) || null,
    message_count: countMap.get(thread.id) || 0,
  }));

  return threadsWithMessages as MessageThread[];
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
export async function fetchThread(threadId: string): Promise<MessageThread | null> {
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

