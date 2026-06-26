import { jsonResponse } from "./cors.ts";

/** Shared 410 body for retired Milo Edge endpoints. See docs/MILO_EDGE_DEPRECATION.md. */
export function miloLegacyDeprecatedResponse(replacement: string) {
  return jsonResponse(
    {
      error: "deprecated",
      message:
        "This Supabase Edge endpoint is retired. Milo chat and FAQ RAG run on PawBuck.API.",
      replacement,
      docs: "https://github.com/pawbuck-dev/pawbuck-root/blob/main/docs/MILO_EDGE_DEPRECATION.md",
    },
    410
  );
}
