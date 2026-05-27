import { assertEquals } from "jsr:@std/assert";
import { normalizeAnalyzeInternalError } from "../pawbuck-milo-api.ts";

Deno.test("normalizeAnalyzeInternalError parses JSON error field", () => {
  assertEquals(
    normalizeAnalyzeInternalError(503, '{"error":"analyze-internal not configured"}'),
    "analyze-internal not configured",
  );
});

Deno.test("normalizeAnalyzeInternalError replaces HTML 504 body", () => {
  const html =
    "<html><head><title>504 Gateway Time-out</title></head><body><center><h1>504 Gateway Time-out</h1></center></body></html>";
  assertEquals(
    normalizeAnalyzeInternalError(504, html),
    "Gateway timeout (504) calling analyze-internal — check API/ALB timeout and retry.",
  );
});
