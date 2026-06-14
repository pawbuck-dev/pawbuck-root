/** User-facing summary when Milo HTTP calls fail. */
export function parseMiloChatHttpError(body: string, status: number): string {
  const trimmed = body.trim();
  if (!trimmed) {
    return status >= 500 ? `server error (${status})` : `request failed (${status})`;
  }

  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof json.answer === "string" && json.answer.trim()) {
      return json.answer.trim();
    }
    if (typeof json.message === "string" && json.message.trim()) {
      return json.message.trim();
    }
    if (typeof json.detail === "string" && json.detail.trim()) {
      return json.detail.trim();
    }
    if (typeof json.title === "string" && json.title.trim()) {
      return json.title.trim();
    }
    if (typeof json.error === "string" && json.error.trim()) {
      return json.error.trim();
    }
  } catch {
    /* not JSON */
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("<") || trimmed.length > 160) {
    return status >= 500 ? `server error (${status})` : `request failed (${status})`;
  }

  return trimmed;
}

/** True when a non-OK Milo response still includes a usable answer payload. */
export function tryParseMiloChatAnswerFromErrorBody(body: string): string | null {
  try {
    const json = JSON.parse(body.trim()) as { answer?: unknown };
    if (typeof json.answer === "string" && json.answer.trim()) {
      return json.answer.trim();
    }
  } catch {
    /* ignore */
  }
  return null;
}
