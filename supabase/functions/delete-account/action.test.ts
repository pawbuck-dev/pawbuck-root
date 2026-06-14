import { assertEquals } from "jsr:@std/assert";

/** Pure helper mirroring delete-account action parsing. */
export function parseDeleteAccountAction(body: unknown): "schedule" | "cancel" {
  if (body && typeof body === "object" && "action" in body) {
    const action = (body as { action?: string }).action;
    if (action === "cancel") return "cancel";
  }
  return "schedule";
}

Deno.test("parseDeleteAccountAction defaults to schedule", () => {
  assertEquals(parseDeleteAccountAction(undefined), "schedule");
  assertEquals(parseDeleteAccountAction({}), "schedule");
});

Deno.test("parseDeleteAccountAction honors cancel", () => {
  assertEquals(parseDeleteAccountAction({ action: "cancel" }), "cancel");
});
