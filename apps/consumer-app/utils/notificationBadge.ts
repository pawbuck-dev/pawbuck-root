/** Format unread/notification counts for badge display (no zero-padding). */
export function formatNotificationBadge(count: number): string {
  if (count <= 0) return "0";
  if (count > 99) return "99+";
  return String(count);
}
