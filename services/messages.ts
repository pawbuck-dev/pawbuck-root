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
 */
export async function fetchMessageThreads(
  petId?: string
): Promise<MessageThread[]> {
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

  // Fetch last message and count for each thread
  const threadsWithMessages = await Promise.all(
    (data || []).map(async (thread) => {
      const { data: messages } = await supabase
        .from("thread_messages")
        .select("*")
        .eq("thread_id", thread.id)
        .order("sent_at", { ascending: false })
        .limit(1);

      const { count } = await supabase
        .from("thread_messages")
        .select("*", { count: "exact", head: true })
        .eq("thread_id", thread.id);

      return {
        ...thread,
        last_message: messages?.[0] || null,
        message_count: count || 0,
      };
    })
  );

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

