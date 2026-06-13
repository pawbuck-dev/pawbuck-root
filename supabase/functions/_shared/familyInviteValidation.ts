export const PET_FAMILY_ROLES = ["view_only", "contributor", "admin"] as const;
export type PetFamilyRole = (typeof PET_FAMILY_ROLES)[number];

export function looksLikeEmail(value: string): boolean {
  const t = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export function isPetFamilyRole(value: string): value is PetFamilyRole {
  return (PET_FAMILY_ROLES as readonly string[]).includes(value);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildFamilyInviteAcceptUrl(appUrl: string, token: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/accept-invite?token=${encodeURIComponent(token)}`;
}

export function buildFamilyInviteEmailBodies(options: {
  inviterDisplay: string;
  petName: string;
  acceptUrl: string;
}): { subject: string; text: string; html: string } {
  const inviter = escapeHtml(options.inviterDisplay);
  const pet = escapeHtml(options.petName);
  const url = escapeHtml(options.acceptUrl);
  const subject = `You're invited to ${options.petName}'s care team on PawBuck`;
  const text =
    `${options.inviterDisplay} has invited you to join ${options.petName}'s care team on PawBuck.\n\n` +
    `Accept (valid until invite expires): ${options.acceptUrl}\n\n` +
    `If you did not expect this, you can ignore this email.`;
  const html =
    `<p>${inviter} has invited you to join <strong>${pet}</strong>'s care team on PawBuck.</p>` +
    `<p><a href="${url}">Click here to accept</a></p>` +
    `<p style="color:#666;font-size:12px">If you did not expect this, you can ignore this email.</p>`;
  return { subject, text, html };
}
