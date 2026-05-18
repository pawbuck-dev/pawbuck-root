import { resolveEmailReferenceYear } from "./emailReferenceTime.ts";
import { assertEquals } from "jsr:@std/assert";

Deno.test("resolveEmailReferenceYear uses email Date header year", () => {
  assertEquals(resolveEmailReferenceYear("2024-08-15T12:00:00Z"), 2024);
});

Deno.test("resolveEmailReferenceYear falls back to current UTC year", () => {
  const y = new Date().getUTCFullYear();
  assertEquals(resolveEmailReferenceYear(null), y);
});
