export type NotificationHubApproval = {
  id: string;
  pet_id: string;
  petName?: string;
  sender_email?: string;
};

export type NotificationHubThread = {
  id: string;
  pet_id: string | null;
  petName?: string;
  recipient_name?: string | null;
  unread_count?: number;
};

export type NotificationHubItem =
  | {
      kind: "pending_approval";
      id: string;
      petId: string;
      title: string;
      subtitle: string;
      route: { pathname: string; params?: Record<string, string> };
    }
  | {
      kind: "unread_thread";
      id: string;
      petId: string;
      title: string;
      subtitle: string;
      route: { pathname: string; params?: Record<string, string> };
    };

export function buildNotificationHubItems(
  approvals: NotificationHubApproval[],
  threads: NotificationHubThread[]
): NotificationHubItem[] {
  const items: NotificationHubItem[] = [];

  for (const approval of approvals) {
    items.push({
      kind: "pending_approval",
      id: `approval-${approval.id}`,
      petId: approval.pet_id,
      title: "Email needs review",
      subtitle: approval.petName
        ? `${approval.petName} · ${approval.sender_email ?? "Unknown sender"}`
        : (approval.sender_email ?? "Review incoming email"),
      route: {
        pathname: "/(home)/messages",
        params: { petId: approval.pet_id, focus: "inbox" },
      },
    });
  }

  for (const thread of threads) {
    const unread = thread.unread_count ?? 0;
    if (unread <= 0 || !thread.pet_id) continue;
    items.push({
      kind: "unread_thread",
      id: `thread-${thread.id}`,
      petId: thread.pet_id,
      title: thread.recipient_name ?? "Care team message",
      subtitle: thread.petName
        ? `${thread.petName} · ${unread} unread`
        : `${unread} unread message${unread === 1 ? "" : "s"}`,
      route: {
        pathname: "/(home)/messages",
        params: { petId: thread.pet_id, threadId: thread.id },
      },
    });
  }

  return items;
}
