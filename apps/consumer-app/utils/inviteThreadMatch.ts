export type InviteThreadCandidate = {
  id: string;
  subject: string | null;
  created_at: string;
};

const INVITE_SUBJECT_RE =
  /\binvitation\b|\bcalendar invite\b|\bappointment\b|\bupdated invitation\b|\baccepted:/i;

/**
 * Pick the inbox thread that most likely owns an email calendar invite booking
 * when `vet_bookings.thread_message_id` was never set (legacy imports).
 */
export function pickInviteThreadForBooking(
  booking: { service_label: string | null; created_at: string },
  threads: InviteThreadCandidate[],
  options?: { windowMs?: number },
): string | null {
  if (threads.length === 0) return null;

  // Keyword-only matches must be near the booking insert time.
  const windowMs = options?.windowMs ?? 14 * 24 * 60 * 60 * 1000;
  const label = (booking.service_label ?? "").trim().toLowerCase();
  const bookingTs = new Date(booking.created_at).getTime();
  if (Number.isNaN(bookingTs)) return null;

  type Scored = { id: string; score: number; delta: number };
  const scored: Scored[] = [];

  for (const thread of threads) {
    const subject = (thread.subject ?? "").trim();
    if (!subject) continue;
    const subjectLower = subject.toLowerCase();
    const threadTs = new Date(thread.created_at).getTime();
    if (Number.isNaN(threadTs)) continue;
    const delta = Math.abs(threadTs - bookingTs);

    const labelHit = label.length >= 3 && subjectLower.includes(label);
    const inviteHit = INVITE_SUBJECT_RE.test(subject);
    if (!labelHit && !inviteHit) continue;
    // Without a service-label hit, only consider nearby invitation-like subjects.
    if (!labelHit && delta > windowMs) continue;

    let score = 0;
    if (labelHit) score += 100;
    if (inviteHit) score += 40;
    score += Math.max(0, 24 - delta / (60 * 60 * 1000));
    scored.push({ id: thread.id, score, delta });
  }

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score || a.delta - b.delta);
  return scored[0]!.id;
}
