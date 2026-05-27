import { assertEquals } from "jsr:@std/assert@1";
import { ocrDeprecatedResponse } from "../ocr-deprecated.ts";

Deno.test("ocrDeprecatedResponse returns 410 when edge OCR disabled", async () => {
  Deno.env.set("EDGE_OCR_FUNCTIONS_ENABLED", "false");
  try {
    const res = ocrDeprecatedResponse(new Request("https://x/vaccination-ocr", { method: "POST" }));
    assertEquals(res?.status, 410);
    const body = await res!.json();
    assertEquals(body.error, "ocr_deprecated");
  } finally {
    Deno.env.delete("EDGE_OCR_FUNCTIONS_ENABLED");
  }
});

Deno.test("ocrDeprecatedResponse returns null when edge OCR enabled", () => {
  Deno.env.set("EDGE_OCR_FUNCTIONS_ENABLED", "true");
  try {
    const res = ocrDeprecatedResponse(new Request("https://x/medication-ocr", { method: "POST" }));
    assertEquals(res, null);
  } finally {
    Deno.env.delete("EDGE_OCR_FUNCTIONS_ENABLED");
  }
});

Deno.test("ocrDeprecatedResponse handles OPTIONS when disabled", () => {
  Deno.env.set("EDGE_OCR_FUNCTIONS_ENABLED", "false");
  try {
    const res = ocrDeprecatedResponse(new Request("https://x/lab-results-ocr", { method: "OPTIONS" }));
    assertEquals(res?.status, 200);
  } finally {
    Deno.env.delete("EDGE_OCR_FUNCTIONS_ENABLED");
  }
});
