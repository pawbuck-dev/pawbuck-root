import { useAuth } from "@/context/authContext";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { supabase } from "@/utils/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";

function invalidateMessageThreads(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["messageThreads"] });
}

/**
 * Keeps the messages unread count in the bottom nav up to date by:
 * 1. Subscribing to new thread_messages (INSERT) via Supabase Realtime when enabled.
 * 2. Refetching when the app comes to the foreground so the count updates without pull-to-refresh.
 *
 * Realtime requires: table "thread_messages" in Dashboard → Database → Replication.
 */
export function useMessageThreadsRealtime() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { refreshPendingApprovals } = useEmailApproval();

  // Realtime: new message inserted → invalidate → nav badge updates
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const channel = supabase
      .channel("thread_messages_insert")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "thread_messages",
        },
        () => {
          invalidateMessageThreads(queryClient);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user, queryClient]);

  // App in foreground → refetch threads + pending approvals so nav badge updates without pull-to-refresh
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          invalidateMessageThreads(queryClient);
          refreshPendingApprovals();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, user, queryClient, refreshPendingApprovals]);
}
