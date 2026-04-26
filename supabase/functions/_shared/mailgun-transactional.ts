/**
 * Minimal Mailgun transactional send (shared by Edge functions).
 * Requires MAILGUN_API_KEY, MAIL_DOMAIN, and optionally PAWBUCK_NOTIFICATIONS_FROM.
 */
export type TransactionalEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type TransactionalEmailResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "mailgun_error"; detail?: string };

export async function sendTransactionalEmailMailgun(
  input: TransactionalEmailInput
): Promise<TransactionalEmailResult> {
  const apiKey = Deno.env.get("MAILGUN_API_KEY");
  const domain = Deno.env.get("MAIL_DOMAIN");
  const from =
    Deno.env.get("PAWBUCK_NOTIFICATIONS_FROM") ||
    (domain ? `notifications@${domain}` : "");

  if (!apiKey || !domain || !from) {
    console.warn("[mailgun-transactional] Mailgun not configured; skip email");
    return { ok: false, reason: "not_configured" };
  }

  const formData = new FormData();
  formData.append("from", `PawBuck <${from}>`);
  formData.append("to", input.to.trim());
  formData.append("subject", input.subject);
  formData.append("text", input.text);
  if (input.html) {
    formData.append("html", input.html);
  }

  const mailgunUrl = `https://api.mailgun.net/v3/${domain}/messages`;
  const res = await fetch(mailgunUrl, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`api:${apiKey}`)}` },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[mailgun-transactional] Mailgun error", res.status, errText);
    return {
      ok: false,
      reason: "mailgun_error",
      detail: `${res.status}: ${errText}`,
    };
  }

  return { ok: true };
}
